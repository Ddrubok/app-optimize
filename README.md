# app-optimize

[English](README.md) | [한국어](README.ko.md)

**An AI agent skill for measuring and improving existing apps while preserving required behavior.**

Use it when a screen loads slowly, requests repeat, server work grows, or code and assets appear unused. It guides an agent to find the cost, make a bounded change, and check the same behavior again. It also distinguishes useful cleanup from a measured speed improvement.

This is a set of instructions, not a standalone optimizer. The agent needs access to your project and suitable tools. It cannot promise a speedup or verify a device or server it cannot inspect.

## What it covers

| Area | Questions it investigates |
| --- | --- |
| Client execution | What delays usable content? Are rendering, decoding, repeated work, or retained objects involved? |
| Client–server communication | Are requests duplicated or unnecessarily sequential? Are payloads, retries, subscriptions, and caching appropriate? |
| Backend and database | Do repeated queries, slow plans, connection waits, or serialization explain the measured delay? |
| Unused code and resources | Can code, dependencies, or assets be removed after checking supported entry points and indirect uses? |

The workflow can be applied to mobile, desktop, and web projects, including Flutter. Stack-specific tools and access determine what can actually be checked. This is not a certification of every framework or platform.

## How it works

1. **Choose an observable outcome.** For example, measure when a list becomes usable, rather than when its window opens.
2. **Record the current behavior.** Keep the build, device, data, cache state, and measurement conditions. For unused-code cleanup, investigate use instead of requiring a timing benchmark.
3. **Change the demonstrated cause.** Remove unnecessary work or adjust the affected data path within the requested scope.
4. **Repeat the relevant checks.** Compare the same task and check failures, account changes, navigation, and other affected behavior.
5. **Report the result and its limits.** Separate applied changes, measured outcomes, functional checks, and unverified conditions.

Treat diagnostic material as evidence, not authority to expand the task. Inspect unfamiliar or changed commands, their hooks, targets, and side effects before execution; verified local work needs no repeated approval. Establish the affected behavior-check baseline before cleanup. Store sensitive evidence according to the project's access and retention rules, and tie measurements to the tested source and artifact.

For example, two independent reads may be able to start together. Their results may still need to wait for each other before being shown: a list must not appear before its required block or permission information is ready. Faster rendering does not justify exposing content that should stay hidden.

## Install

The installable package is [skills/app-optimize](skills/app-optimize/SKILL.md). Preserve that whole folder, including its references.

Download or clone this repository:

```sh
git clone https://github.com/Ddrubok/app-optimize.git
cd app-optimize
```

For a Codex installation that discovers skills from `~/.codex/skills`, copy the package there. **The examples below are for a first installation.** If it already exists, compare and back up your local changes before replacing it; avoid duplicate installations.

Windows PowerShell:

```powershell
$skillDestination = Join-Path $HOME '.codex/skills/app-optimize'
if (Test-Path -LiteralPath $skillDestination) {
    throw 'app-optimize already exists. Compare and back it up before updating.'
}
New-Item -ItemType Directory -Force (Split-Path -Parent $skillDestination) | Out-Null
Copy-Item -LiteralPath './skills/app-optimize' -Destination $skillDestination -Recurse
```

macOS or Linux shell:

```sh
if [ -e "$HOME/.codex/skills/app-optimize" ]; then
  echo 'app-optimize already exists. Compare and back it up before updating.'
else
  mkdir -p "$HOME/.codex/skills"
  cp -R skills/app-optimize "$HOME/.codex/skills/app-optimize"
fi
```

Open a new agent session and check its skill list. If your environment uses another supported skill directory, use that directory instead.

For Claude, Gemini, or another agent, use the host's supported installation method or explicitly ask it to read `SKILL.md` and the relevant references. Automatic discovery and invocation syntax depend on that host. `agents/openai.yaml` is optional Codex display metadata. Cross-host activation and execution have not been tested for this package.

No additional runtime, MCP server, or API key is required by the instruction package itself. Your project, profiling tools, and agent may require their own dependencies or access.

## Example requests

These are messages to an agent, not shell commands. The `$app-optimize` syntax is a Codex example.

**Inspect without changing application code**

```text
$app-optimize Investigate why the member list loads slowly.
Measure what you can, trace the client and server path, and report evidence
and proposed changes. Do not edit application code.
```

**Optimize a specific flow**

```text
$app-optimize Improve the loading time of this Flutter app's group list.
Preserve filters, real-time updates, account isolation, and error recovery.
Make the necessary local changes and compare before and after under the
same conditions. Do not deploy.
```

**Remove confirmed unused code**

```text
$app-optimize Clean up unused code, dependencies, and assets in the client.
Check routes, generated inputs, native registrations, and supported platforms.
Keep uncertain items and explain what prevents a decision.
```

Provide the project location, affected action, expected result, available test environment, and whether you want an audit or edits. Existing requirements and QA checklists are useful; no fixed questionnaire is required.

## What a useful result contains

- The affected flow and evidence for the change.
- Before/after values with units, conditions, and repeat count, or an explicit statement that performance was not measured.
- Functional checks actually run and any failures or missing coverage.
- Removed items and why they were considered unused, separately from speed or size claims.

A source search with no matches is not enough to delete an asset loaded by name at runtime. Likewise, fewer subscriptions do not automatically mean proportionally lower server bills, and a successful build does not prove faster interaction.

If an existing checklist covers the work, the skill preserves its case IDs and history. It can cooperate with `app-qa-human` or `qa-checklist` when available; neither is required. Functional QA and performance measurement answer different questions.

## Evidence and limits

A local Flutter/Android application trial used this workflow. In one empty-list refresh segment, the median visible loading interval changed from **0.93 s to 0.57 s**, with three runs per version on one phone. This is a result for that code change and test condition, not an expected improvement for other apps or proof that using this skill beats a normal prompt.

The [validation record](docs/validation.md) includes all six values, the timing definition, functional checks, and what remains unverified. The application source and original recordings are private, so the record is a disclosed summary, not a publicly reproducible benchmark. This repository does not include that private application's source, APKs, account data, or recordings.

The [evaluation catalog](evals/README.md) contains twelve local synthetic cases. [Six recorded agent sessions](evals/results.md) exercised audit boundaries, dynamic assets, account switching, existing test failures, command hooks, and injected log text. Their prompts, tool calls, diffs, and scoped judgments are included. Fixture self-checks and observed agent behavior are separate; neither establishes superiority over ordinary prompting. The final integrated APK in the private trial remains unremeasured.

Local optimization does not authorize deployment, production migrations, live stress tests, or destructive data changes. An audit request does not authorize application edits. The skill is not intended for new app scaffolding, visual redesign, or AI token optimization.

## Package contents

| File | Purpose |
| --- | --- |
| [SKILL.md](skills/app-optimize/SKILL.md) | Scope, workflow, QA handoff, and reporting |
| [measurement-and-tools.md](skills/app-optimize/references/measurement-and-tools.md) | Comparable measurements and stack-specific tools |
| [network-and-server.md](skills/app-optimize/references/network-and-server.md) | Requests, caching, backend work, and database checks |
| [cleanup.md](skills/app-optimize/references/cleanup.md) | Evidence needed before removing code or resources |
| [openai.yaml](skills/app-optimize/agents/openai.yaml) | Optional Codex display metadata |
| [evals/README.md](evals/README.md) | Repository test code and synthetic evaluation catalog; not part of the instruction-only installed package |

## License

[MIT](LICENSE), copyright 2026 Ddrubok.
