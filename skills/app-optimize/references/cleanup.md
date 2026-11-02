# Unused code and resources

## Establish use before removing anything

Start with the requested module and its entry points. Use compiler/analyzer findings, import/call graphs, configuration, and source inspection to identify candidates. Zero text matches or zero calls in one trace is not proof of disuse. Record the examined targets; do not imply repository-wide certainty from one build.

Check the usage channels relevant to each candidate:

- Direct imports, callers, exports, tests, fixtures, examples, scripts, and build/test tooling.
- Registration tables, dependency injection, reflection where supported, string-based routes, dynamic loading, and side-effect-only imports.
- Generated code and its inputs, plugin/native registrations, platform branches, feature flags, flavors, release/debug entry points, and other packages in a monorepo.
- Asset/font/localization declarations and dynamically constructed resource names. A resource loaded from configuration may have no literal source reference.
- Public APIs, serialization/persistence formats, external consumers, old supported app versions, background jobs, and fallback/recovery paths.

Do not blindly exclude generated files and build configuration from a usage investigation just because they are excluded from ordinary source editing. Regenerate through existing tooling when required to establish the graph; change the owning input instead of hand-editing generated output. Do not treat a fallback as dead merely because the ordinary path succeeds.

## Decide per candidate

| Decision | Required basis | Action |
|---|---|---|
| Confirmed unused in the examined scope | Entry points and relevant indirect/configuration consumers were checked; no supported use remains | Remove within the authorized scope, then run applicable checks. |
| Used or required for compatibility | A real caller, registration, build role, contract, or recovery requirement exists | Retain; explain only if it was a reported candidate. |
| Unresolved | A relevant target, external consumer, generator, or dynamic lookup cannot be checked | Retain and name the missing evidence. |

A new speculative feature does not justify keeping an otherwise proven unused private helper. An existing supported external contract does. State that distinction rather than inventing hypothetical callers or treating all public code as removable.

## Make a reversible cleanup

Remove one coherent set at a time. Preserve unrelated edits and keep cleanup separate from behavior/performance experiments. For an unused dependency, use the project's package manager and verify the manifest and lockfile change together; do not combine cleanup with broad dependency upgrades. Package use includes command-line tools, plugins, type support, and native build integration.

Removing redundant code requires checking side effects, call order, asynchronous behavior, and exceptional paths, not only matching text. Do not remove security checks, validation, error recovery, accessibility behavior, compatibility branches, or transaction boundaries to make the code shorter. Test-only use is still use; investigate a stale test separately instead of deleting it to justify the cleanup.

Run the relevant analyzer/type check, build, tests, and affected flows after removal. Compare failures with the existing baseline. If a required target cannot run, do not mark it passed; retain uncertain candidates and report any applied cleanup's unverified target. Restore your own removals if a new failure traces back to them. Do not suppress a failure or change its expectation just to get a passing cleanup.

## Report the actual benefit

List removed items with their evidence and remaining coverage limits. Use the diff or tool output for counts. A source cleanup may reduce maintenance without changing runtime or release size, especially when the build already excludes the code. Claim memory, speed, build-time, or download-size savings only after measuring the corresponding result under equivalent conditions.

## References

- [Knip entry points, generated code, and dynamic references](https://knip.dev/guides/handling-issues) (JavaScript/TypeScript; not a Dart analyzer.)
- [Dart static analysis](https://dart.dev/tools/dart-analyze)
- [Flutter size analysis](https://docs.flutter.dev/perf/app-size)
