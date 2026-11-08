// Local evaluator process control. IPC prevents printed fake verdicts from passing;
// ponytail: reviewed fixtures only; hostile candidates need an OS sandbox.
// Imported code shares the worker process; IPC is not a security boundary.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const LIMIT_MS = 2500;
const OUTPUT_BYTES = 64 * 1024;
const CLEANUP_MS = 1200;
const workerFile = fileURLToPath(import.meta.url);

const allowedEnv = [
  'PATH', 'PATHEXT', 'SystemRoot', 'WINDIR', 'ComSpec', 'TEMP', 'TMP',
  'TMPDIR', 'HOME', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'LANG',
];
function minimalEnv() {
  const env = {};
  for (const name of allowedEnv) {
    const key = Object.keys(process.env).find(k => k.toLowerCase() === name.toLowerCase());
    if (key) env[name] = process.env[key];
  }
  return env;
}

function errorFields(error) {
  return { code: error?.code, message: error?.message, actual: error?.actual, expected: error?.expected };
}

if (process.argv[2] === '--evals-worker') {
  process.once('message', async message => {
    if (message?.type !== 'start') return;
    process.channel.ref();
    // Observe fatal errors without suppressing Node's default failure exit.
    process.on('uncaughtExceptionMonitor', (caught, origin) => {
      if (process.connected) process.send({ type: 'runtime-error', id: message.id, error: { ...errorFields(caught), origin } });
    });
    let error = null;
    try {
      await import(`data:text/javascript;base64,${Buffer.from(message.source).toString('base64')}`);
    } catch (caught) {
      error = errorFields(caught);
    }
    process.send({ type: 'completion', id: message.id, error }, sendError => {
      if (sendError) process.exitCode = 1;
      // Candidate work must drain naturally; evaluator IPC must not keep it alive.
      process.channel?.unref();
    });
  });
}

async function killTree(child) {
  if (!child.pid) return { attempted: false };
  if (process.platform !== 'win32') {
    try {
      process.kill(-child.pid, 'SIGKILL');
      return { attempted: true, method: 'process-group', ok: true };
    } catch (error) {
      if (error.code === 'ESRCH') return { attempted: true, method: 'process-group', ok: true };
      child.kill('SIGKILL');
      return { attempted: true, method: 'process-group', ok: false, errorCode: error.code };
    }
  }
  return await new Promise(resolve => {
    const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
      windowsHide: true, stdio: 'ignore', env: minimalEnv(),
    });
    let done = false;
    const finish = (ok, errorCode) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (!ok) child.kill('SIGKILL');
      resolve({ attempted: true, method: 'taskkill', ok, ...(errorCode && { errorCode }) });
    };
    const timer = setTimeout(() => { killer.kill('SIGKILL'); finish(false, 'CLEANUP_TIMEOUT'); }, CLEANUP_MS);
    killer.once('error', error => finish(false, error.code));
    killer.once('exit', code => finish(code === 0, code === 0 ? undefined : `TASKKILL_${code}`));
  });
}

function execute(cwd, command, args, { codeId, source, shell = false } = {}) {
  return new Promise(resolve => {
    const isCode = codeId !== undefined;
    const child = spawn(command, args, {
      cwd, shell, windowsHide: true, detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe', ...(isCode ? ['ipc'] : [])], env: minimalEnv(),
    });
    let stdout = '';
    let stderr = '';
    let bytes = 0;
    let reason = null;
    let verdict = null;
    let runtimeError = null;
    let completions = 0;
    let exitCode = null;
    let signal = null;
    let errorCode = null;
    let finished = false;
    let cleaning = false;
    let cleanup = null;
    const closed = new Promise(done => child.once('close', done));

    const startCleanup = async why => {
      if (finished) return;
      if (cleaning) return;
      cleaning = true;
      reason = why;
      cleanup = { ...await killTree(child), reason: why };
      let closeTimer;
      const closeTimedOut = await Promise.race([
        closed.then(() => false),
        new Promise(done => { closeTimer = setTimeout(() => done(true), CLEANUP_MS); }),
      ]);
      clearTimeout(closeTimer);
      if (closeTimedOut) cleanup = { ...cleanup, ok: false, errorCode: 'CLOSE_TIMEOUT' };
      // Bound retained pipe/IPC handles even when cleanup could not be confirmed.
      child.stdout?.destroy();
      child.stderr?.destroy();
      if (child.connected) child.disconnect();
      child.unref();
      finish();
    };
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      const complete = isCode ? completions === 1 && verdict?.id === codeId && verdict.type === 'completion' : true;
      const expected = isCode && source.expectedError;
      const matched = isCode && (expected
        ? verdict?.error && Object.entries(expected).every(([key, value]) =>
          key === 'message' ? verdict.error.message?.split('\n', 1)[0] === value : Object.is(verdict.error[key], value))
          && Object.keys(verdict.error).filter(key => verdict.error[key] !== undefined).every(key => Object.hasOwn(expected, key))
        : verdict?.error === null);
      const ok = reason === 'exit' && exitCode === 0 && signal === null
        && (!isCode || complete && matched && !runtimeError);
      let kind = reason;
      if (reason === 'exit' && runtimeError) kind = 'execution-error';
      else if (reason === 'exit' && signal) kind = 'signal';
      else if (reason === 'exit' && exitCode !== 0) kind = 'exit';
      else if (reason === 'exit' && isCode && !complete) kind = 'missing-completion';
      else if (reason === 'exit' && isCode && !matched) kind = expected
        ? (verdict?.error === null ? 'expected-error-missing' : 'expected-error-mismatch')
        : (verdict?.error?.code === 'ERR_ASSERTION' ? 'assertion-failed' : 'execution-error');
      else if (reason === 'exit' && isCode) kind = 'complete';
      resolve({ ok, kind, exitCode, signal, errorCode: errorCode ?? runtimeError?.code ?? verdict?.error?.code ?? null,
        stdout, stderr, completedChecks: isCode && complete && matched ? 1 : 0,
        ...(verdict?.error && { error: verdict.error }), ...(runtimeError && { runtimeError }), ...(cleanup && { cleanup }) });
    };
    const timer = setTimeout(() => startCleanup('timeout'), LIMIT_MS);
    const capture = (stream, chunk) => {
      const remaining = Math.max(0, OUTPUT_BYTES - bytes);
      const part = chunk.subarray(0, remaining);
      if (stream === 'stdout') stdout += part.toString('utf8');
      else stderr += part.toString('utf8');
      bytes += chunk.length;
      if (bytes > OUTPUT_BYTES) startCleanup('output-limit');
    };
    child.stdout.on('data', chunk => capture('stdout', chunk));
    child.stderr.on('data', chunk => capture('stderr', chunk));
    child.once('error', error => { errorCode = error.code; startCleanup('spawn-error'); });
    child.once('exit', (code, gotSignal) => {
      exitCode = code;
      signal = gotSignal;
      if (!cleaning) reason = 'exit';
    });
    child.once('close', () => { if (!cleaning) finish(); });
    if (isCode) {
      child.on('message', message => {
        if (message?.type === 'runtime-error' && message.id === codeId) {
          runtimeError = message.error;
          return;
        }
        if (message?.type !== 'completion' || message.id !== codeId) {
          startCleanup('protocol-error');
          return;
        }
        completions++;
        verdict = message;
        if (completions !== 1) startCleanup('protocol-error');
      });
      child.send({ type: 'start', id: codeId, source: source.text }, error => {
        if (error && !cleaning && !finished) { errorCode = error.code; startCleanup('ipc-error'); }
      });
    }
  });
}

export async function runCode(cwd, id, source, expectedError = null) {
  return execute(cwd, process.execPath, ['--unhandled-rejections=strict', workerFile, '--evals-worker'], {
    codeId: id, source: { text: source, expectedError },
  });
}

export async function runCommand(cwd, command, args = [], options = {}) {
  return execute(cwd, command, args, { shell: options.shell === true });
}
