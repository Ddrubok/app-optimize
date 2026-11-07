# Validation record and limits

[English](validation.md) | [한국어](validation.ko.md) | [Root guide](../README.md)

Publication prepared on 2026-11-03. Application measurements below were recorded on 2026-11-02. No new app benchmark was run for publication.

## What this record establishes

The workflow was used on a local Flutter application. Two client changes were tested: retaining list subscriptions across local filter changes, and starting two independent reads together while waiting for both before publishing the result. The application's original recordings, test logs, and source remain private. This page summarizes them; it is not a reproducible public benchmark or an independent audit.

The comparison was between two versions of the application. There was no same-model control group performing the task without this skill, so it does not establish a general benefit of the skill over ordinary prompting.

The [synthetic evaluation catalog](../evals/README.md) is separate from this private trial. [Six agent sessions recorded on 2026-11-07 KST](../evals/results.md) include prompts, tool calls, diffs, and scoped judgments for E01/E03/E05/E08/E09/E10. Fixture self-checks, observed behavior, and comparative superiority are different forms of evidence; no no-skill control was run. The installable skill is instructions; repository evaluation code is not included in that package.

## Physical-device comparison

- One SM-G998N phone running Android 15, one logged-in account, three runs per variant.
- Release builds with matching package identity, signing, and version settings, using the existing Firebase environment.
- Order: A1, B1, B2, A2, A3, B3. A is the baseline; B is the optimized version. A preliminary pilot was excluded.
- The app process restarted for each run. App data, login, and disk caches were retained; this was not a clean-install benchmark.
- Screen recording: 720 × 1600, 4 Mbps. Durations use original variable-rate frame presentation timestamps, not command execution time or a fixed-FPS assumption.

The social-list refresh interval starts when its earlier empty-state message disappears and loading begins, and ends when the normal empty-state result returns. It excludes the drag gesture and the final animation of the top refresh indicator. The account had no matching social-list items, so this did not measure a populated list or its photos.

Club entry starts at the first club-screen frame and ends when the first card title/list content appears. Filter intervals run from the visibly selected filter to the corresponding first result item. Completion does not require every thumbnail to finish loading.

| Run | Variant | Empty social-list refresh ms | Club entry ms | Sport filter ms | Return to all ms |
| --- | --- | ---: | ---: | ---: | ---: |
| A1 | Baseline | 899.011 | 41.700 | 30.711 | 47.511 |
| B1 | Optimized | 565.956 | 33.323 | Not observed | Not observed |
| B2 | Optimized | 656.755 | 32.755 | Not observed | Not observed |
| A2 | Baseline | 1015.800 | 33.423 | 30.645 | 31.889 |
| A3 | Baseline | 930.300 | 41.734 | 21.689 | 23.311 |
| B3 | Optimized | 548.645 | 25.133 | Not observed | Not observed |

“Not observed” means no separate blank/loading frame was captured. It does not mean zero input latency. Decimal places retain the source calculation; they do not establish microsecond accuracy.

The social-list median was 930.300 ms before and 565.956 ms after: a reduction of about 364 ms, or 39%, in this specific interval. Observed ranges were 899–1,016 ms and 549–657 ms; these are minima and maxima, not confidence intervals. The club-entry median difference was about 9 ms, too small here to claim a clear perceived improvement.

The analyzing agent inspected the transition images for all six runs. There was no independent human timing judgment. Network load and server state were not fully controlled. This sample does not establish app-wide speed, tail latency, memory use, energy savings, server processing time, or billing reductions.

## Local functional and simulated checks

The same screen widgets were also exercised with local Firebase platform doubles. For fixed read delays of 200 ms and 120 ms, the simulated social-list completion changed from 320 ms to 200 ms. These are virtual test timings, not another phone measurement.

For two local filter changes plus a same-user provider notification, additional subscription starts changed from 12 to 0. This is a test observation of SDK subscription starts, not a count of billed database reads. Each main comparison ran three times.

Checks covered filter results, live list updates, account transitions, logout/guest/relogin behavior, subscription cancellation, hidden blocked content, failure/retry paths, slower page reads, stale-response handling, and leaving a screen while requests were pending. These local doubles do not reproduce the complete Firebase environment or every offline recovery path.

When the two changes were later applied to the current source, the full Flutter suite reported **216 passed and 1 existing skipped test**, and the Android release APK built successfully. Static analysis retained one pre-existing informational style lint; the build also reported existing toolchain support warnings. That integrated APK was not remeasured on the phone. iOS was not run.

Starting independent reads together has a trade-off: the page request can already be in flight when the block-information request fails or the screen closes. It can therefore perform a request that the previous sequential version would never have started. Required filtering still waits for successful completion of both reads.

## Future integrated-APK remeasurement record

The final integrated APK above remains **not remeasured**. If that build is tested later, record the following without reusing the earlier variant's result:

| Field | Record for the future run |
| --- | --- |
| Source and artifact | Exact revision and relevant diff; APK SHA-256 digest; build date and build/configuration details |
| Environment | Device and OS; account/test dataset; network and server conditions; app data and cache state |
| Action and completion | Repeated user action, observable start and completion frames or events, exclusions |
| Runs and evidence | Run order, per-run values and units, repeat count, sanitized raw trace/recording references and evidence custodian |
| Behavior | Affected success, error, privacy/filtering, lifecycle, and retry checks actually run, with results and gaps |

Keep private source, recordings, logs, and account data with their authorized custodian; publish only sanitized evidence and a digest tied to the tested artifact. A digest identifies bytes but does not by itself prove the runtime behavior.
