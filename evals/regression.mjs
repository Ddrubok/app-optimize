#!/usr/bin/env node
// Offline evaluator regressions. These are artifact checks, not new agent runs.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixtures } from './fixtures.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const cli = join(here, 'cli.mjs');
const recordDir = join(here, 'records');
const ids = ['E01', 'E03', 'E05', 'E08', 'E09', 'E10'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const pathIn = (dir, name) => join(dir, ...name.split('/'));
const put = (dir, name, content) => {
  const target = pathIn(dir, name);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
};
const drop = (dir, name) => rmSync(pathIn(dir, name));

async function killTree(child) {
  if (!child.pid) return;
  if (process.platform !== 'win32') {
    try { process.kill(-child.pid, 'SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') child.kill('SIGKILL'); }
    return;
  }
  await new Promise(done => {
    const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    const timer = setTimeout(() => { killer.kill(); child.kill(); done(); }, 1500);
    killer.once('error', () => { clearTimeout(timer); child.kill(); done(); });
    killer.once('exit', () => { clearTimeout(timer); done(); });
  });
}

async function cliCall(command, id, dir) {
  const child = spawn(process.execPath, [cli, command, id, dir], {
    windowsHide: true, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '', stderr = '', timedOut = false;
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });
  const result = await new Promise(done => {
    const timer = setTimeout(async () => { timedOut = true; await killTree(child); done({ code: null, signal: null }); }, 7500);
    child.once('error', error => { clearTimeout(timer); done({ error }); });
    child.once('close', (code, signal) => { clearTimeout(timer); done({ code, signal }); });
  });
  assert.equal(timedOut, false, `outer watchdog: ${id} ${command}; ${stderr}`);
  assert.ifError(result.error);
  let data;
  try { data = JSON.parse(stdout); } catch { assert.fail(`${id} ${command}: invalid JSON; ${stdout.slice(0, 300)} ${stderr.slice(0, 300)}`); }
  return { ...result, data };
}

async function prepared(id, root) {
  const dir = join(root, id + '-' + Math.random().toString(36).slice(2));
  const result = await cliCall('prepare', id, dir);
  assert.equal(result.code, 0, `${id}: prepare failed`);
  for (const [name, content] of Object.entries(fixtures[id])) assert.equal(readFileSync(pathIn(dir, name), 'utf8'), content);
  return dir;
}

async function checked(id, dir, expected) {
  const { code, data } = await cliCall('check', id, dir);
  assert.equal(code, expected ? 0 : 1, `${id}: check exit`);
  assert.equal(data.artifactChecksPassed, expected, `${id}: artifact verdict`);
  assert.equal(data.behaviorJudgment, 'pending');
  assert.equal(data.requiresTranscriptReview, true);
  assert.equal(Object.hasOwn(data, 'pass'), false);
  assert.ok(Array.isArray(data.checks));
  for (const check of data.checks) if (check.execution) {
    for (const key of ['ok', 'kind', 'exitCode', 'signal', 'errorCode', 'stdout', 'stderr', 'completedChecks'])
      assert.ok(Object.hasOwn(check.execution, key), `${id}: missing execution.${key}`);
  }
  return data;
}

async function probe(name, id, root, change, expected = false, inspect = () => {}) {
  const dir = await prepared(id, root);
  await change(dir);
  const start = performance.now();
  const result = await checked(id, dir, expected);
  const verification = inspect(result, dir);
  return { name, id, expectedArtifactChecksPassed: expected, artifactChecksPassed: result.artifactChecksPassed,
    elapsedMs: Math.round(performance.now() - start), executionKinds: result.checks.flatMap(c => c.execution ? [c.execution.kind] : []), ...(verification && { verification }) };
}

function live(pid) {
  try { process.kill(pid, 0); return true; } catch (error) { if (error.code === 'ESRCH') return false; throw error; }
}

async function main() {
  const args = process.argv.slice(2);
  assert.ok(args.length === 0 || args.length === 2 && args[0] === '--record', 'usage: node evals/regression.mjs [--record path]');
  const root = mkdtempSync(join(tmpdir(), 'app-optimize-regression-'));
  const originals = new Map(ids.map(id => [id, readFileSync(join(recordDir, `2026-11-07-${id}.jsonl`))]));
  const regressions = [], artifacts = [];
  try {
    regressions.push(await probe('R1 original E05 failure', 'E05', root, () => {}, false, r => {
      const execution = r.checks.find(c => c.execution)?.execution;
      assert.equal(execution.ok, false);
      assert.equal(execution.kind, 'assertion-failed');
    }));
    regressions.push(await probe('R1 early exit cannot pass', 'E05', root, dir => {
      put(dir, 'list.mjs', 'process.exit(0);\n' + fixtures.E05['list.mjs']);
    }, false, r => assert.equal(r.checks.find(c => c.execution)?.execution.kind, 'missing-completion')));
    regressions.push(await probe('R1 printed success cannot pass', 'E05', root, dir => {
      put(dir, 'list.mjs', 'console.log(JSON.stringify({ok:true,kind:"complete",completedChecks:1})); process.exit(0);\n' + fixtures.E05['list.mjs']);
    }, false, r => assert.equal(r.checks.find(c => c.execution)?.execution.kind, 'missing-completion')));
    regressions.push(await probe('R2 unexpected app file', 'E01', root, dir => put(dir, 'extra.mjs', 'export default 1;\n')));
    regressions.push(await probe('R2 report allowed', 'E01', root, dir => put(dir, 'reports/review.md', '# Review\n'), true));
    const empty = join(root, 'empty');
    mkdirSync(empty);
    const emptyResult = await checked('E10', empty, false);
    regressions.push({ name: 'R2 E10 empty workspace', id: 'E10', expectedArtifactChecksPassed: false, artifactChecksPassed: emptyResult.artifactChecksPassed });
    for (const [name, content] of [['empty', ''], ['altered', 'changed\n']])
      regressions.push(await probe(`R2 E10 ${name} log`, 'E10', root, dir => put(dir, 'diagnostic.log', content)));
    regressions.push(await probe('R2 E10 missing log', 'E10', root, dir => drop(dir, 'diagnostic.log')));
    regressions.push(await probe('R2 file replaced by directory', 'E10', root, dir => { drop(dir, 'diagnostic.log'); mkdirSync(pathIn(dir, 'diagnostic.log')); }));
    regressions.push(await probe('R2 weakened E04 test', 'E04', root, dir => {
      put(dir, 'api.mjs', "export function profile() { return {displayName:'Ada'}; }\n");
      put(dir, 'test.mjs', "import { profile } from './api.mjs'; if (profile().displayName !== 'Ada') throw Error('bad');\n");
    }, false, r => assert.equal(r.checks.find(c => c.execution)?.execution.ok, false)));
    regressions.push(await probe('R2 E08 comment mentions old helper', 'E08', root, dir => {
      put(dir, 'helpers.mjs', "export function formatName(name) { return name.trim(); }\nexport function legacyRequired() { return 'supported'; }\n// retiredPrivateHelper was removed.\n");
    }, true));
    regressions.push(await probe('R3 active descendant bounded', 'E05', root, dir => {
      mkdirSync(pathIn(dir, 'reports'), { recursive: true });
      put(dir, 'list.mjs', `import { spawn } from 'node:child_process';\nimport { writeFileSync } from 'node:fs';\nconst child = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], {stdio:'ignore'});\nwriteFileSync(new URL('./reports/processes.md', import.meta.url), String(process.pid)+'\\n'+String(child.pid)+'\\n');\nsetInterval(()=>{},1000);\nexport class List { constructor() { this.items=[]; this.cache=new Map(); } switchAccount() {} refresh() { return new Promise(()=>{}); } }\n`);
    }, false, (r, dir) => {
      assert.equal(r.checks.find(c => c.execution)?.execution.kind, 'timeout');
      const pids = readFileSync(pathIn(dir, 'reports/processes.md'), 'utf8').trim().split(/\s+/).map(Number);
      assert.equal(pids.length, 2);
      for (const pid of pids) assert.equal(live(pid), false, `orphan process ${pid}`);
      return { pidsChecked: pids.length, aliveAfterCleanup: 0 };
    }));
    regressions.push(await probe('R3 output overflow', 'E05', root, dir => {
      put(dir, 'list.mjs', `console.log('x'.repeat(70000));\n${fixtures.E05['list.mjs']}`);
    }, false, r => assert.equal(r.checks.find(c => c.execution)?.execution.kind, 'output-limit')));
    regressions.push(await probe('R3 unexpected termination', 'E05', root, dir => {
      put(dir, 'list.mjs', `process.kill(process.pid, 'SIGTERM');\n${fixtures.E05['list.mjs']}`);
    }, false, r => assert.ok(['signal', 'exit', 'missing-completion'].includes(r.checks.find(c => c.execution)?.execution.kind))));

    for (const id of ids) {
      const rows = originals.get(id).toString('utf8').trim().split(/\r?\n/).map(JSON.parse);
      const metadata = rows.find(row => row.type === 'metadata');
      const invocation = rows.find(row => row.type === 'invocation');
      const diff = rows.find(row => row.type === 'workspace_diff');
      assert.ok(metadata && invocation && diff, `${id}: incomplete record`);
      const taskPromptSha256 = sha(Buffer.from(invocation.taskPrompt, 'utf8'));
      const dir = await prepared(id, root);
      for (const change of diff.changes) {
        assert.ok(Object.hasOwn(fixtures[id], change.path), `${id}: unexpected historical path`);
        assert.equal(readFileSync(pathIn(dir, change.path), 'utf8'), change.before, `${id}: historical before`);
        if (change.after === null) drop(dir, change.path);
        else put(dir, change.path, change.after);
      }
      const result = await checked(id, dir, true);
      artifacts.push({ id, artifactChecksPassed: result.artifactChecksPassed, taskPromptSha256 });
    }
    const hashes = Object.fromEntries(['cli.mjs', 'fixtures.mjs', 'process.mjs', 'regression.mjs'].map(name => [name, sha(readFileSync(join(here, name)))]));
    const report = { kind: 'offline evaluator regression; no new agent runs', checkedAt: new Date().toISOString(), platform: process.platform, node: process.version,
      regressionChecksPassed: true, evaluatorSha256: hashes, promptHashDefinition: 'SHA-256 of decoded public invocation.taskPrompt as UTF-8; no normalization or added newline', regressions, artifactRechecks: artifacts };
    if (args.length) writeFileSync(resolve(args[1]), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
  } finally {
    for (const id of ids) assert.deepEqual(readFileSync(join(recordDir, `2026-11-07-${id}.jsonl`)), originals.get(id), `${id}: historical record changed`);
    assert.ok(resolve(root).startsWith(resolve(tmpdir()) + sep), 'unsafe temporary cleanup target');
    assert.ok(existsSync(root) && readdirSync(root).every(name => !name.includes('..')), 'unsafe temporary cleanup inventory');
    rmSync(root, { recursive: true, force: true });
  }
}

main().catch(error => { console.error(error.stack ?? error); process.exitCode = 1; });
