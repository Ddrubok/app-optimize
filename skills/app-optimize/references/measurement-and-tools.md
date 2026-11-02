# Measurement and tools

## Make the comparison reproducible

Keep a compact record of the source revision or working diff, command/tool, build configuration, device/runtime, dataset, user action, and completion condition. Include network conditions, cache state, concurrency, and profiler settings when they affect the result. Preserve the baseline evidence before changing code.

Select metrics for the problem: startup or task completion time, frame times and missed frames, retained memory, requests and bytes per action, server latency and errors, or a comparable release artifact's size. Use existing product budgets; do not impose one frame rate, API latency, or bundle limit on every app.

- Repeat measurements enough to expose variation and report the actual sample count and distribution. Do not call a change inside the observed noise an improvement. A small sample cannot establish reliable tail latency.
- Compare equivalent devices, data, builds, load, and instrumentation. Keep cold startup/cache misses separate from warm steady-state work. Do not warm away a first-use problem the user asked to fix.
- Keep the work equivalent: returning fewer required records, skipping persistence, or failing requests earlier is not a speed improvement. Include errors, timeouts, throughput, and deferred work when relevant.
- Use a monotonic clock for local elapsed durations. Do not subtract unsynchronized client and server timestamps or add overlapping spans. Follow the dependency path of one action; summing independent p95 values does not produce end-to-end p95.
- A lower request count, smaller artifact, and faster interaction are different results. Report only what was measured. Lines removed are not a performance metric.

For long-running or load-dependent issues, use a bounded reproduction and an environment already authorized for that load. Do not extrapolate a local serial test into a production capacity claim. Store sufficient sanitized evidence to reproduce the comparison without retaining unnecessary response bodies or secrets.

## Pick tools for the detected stack

Use installed tool versions and project scripts first. Check local help or current official documentation before relying on unfamiliar flags. The examples below are options, not a batch to run for every task.

| Target | Evidence and verification |
|---|---|
| Flutter mobile/desktop | Use `flutter run --profile -d <device-id>` with a representative target and DevTools CPU, frame, memory, or network views. Prefer a physical mobile device for user-facing performance; label emulator-only findings. Distinguish UI work from raster work before changing widgets or paint effects. |
| Flutter web | Use browser performance/network/memory tools on a release-like build. Record renderer and browser; native Flutter frame measurements do not prove browser behavior. |
| Flutter code and size | `flutter analyze` is static analysis, not a benchmark. Use relevant `flutter test` or existing integration tests for behavior. For an Android arm64 target, `flutter build apk --release --target-platform android-arm64 --analyze-size` can produce size evidence; adapt to the actual target and project flavors. Compare identical build configurations. An upload artifact is not the store's per-device download size. |
| JavaScript/TypeScript | Use the browser trace/network panel, the framework's profiler, and release bundle analysis for measured costs. For disuse candidates, run an existing Knip/project analysis script after checking its entry points and framework configuration. Do not auto-install a CLI to inspect the project. |
| Native or other clients | Use available platform/runtime profilers, such as Perfetto on Android or Instruments on a supported Apple host. Keep CPU, GPU, memory, energy, and startup claims tied to the tool and device actually used. |
| Server and database | Use existing request logs, traces, runtime profilers, query counts/plans, and bounded project benchmarks. Record runtime, database engine/version, dataset, and offered load. Read the network/server reference before executing query-plan commands or changing caching. |

For Flutter rebuilds and paint cost, inspect the measured subtree before adding `const`, selectors, repaint boundaries, or isolates. Moving CPU work off the UI thread has setup and transfer costs. For memory, repeat navigation or the relevant lifecycle and inspect retained ownership; a bounded cache or temporary peak alone does not prove a leak. For images, check decoded dimensions as well as transfer size.

Run applicable verification on the available host. An iOS build or device check that the host cannot perform stays not run. Tool unavailability is not a passing result; a source-supported hypothesis can still be reported with its missing verification step.

## Primary references

- [Flutter performance profiling](https://docs.flutter.dev/perf/ui-performance)
- [Flutter app size](https://docs.flutter.dev/perf/app-size)
- [Dart static analysis](https://dart.dev/tools/dart-analyze)
- [Knip issue diagnosis](https://knip.dev/guides/handling-issues)
- [OpenTelemetry traces](https://opentelemetry.io/docs/concepts/signals/traces/)
