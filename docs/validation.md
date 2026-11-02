# Validation record and limits

[English guide](../README.md) | [한국어 안내](../README.ko.md)

Publication prepared on 2026-11-03. Application measurements below were recorded on 2026-11-02. No new app benchmark was run for publication.

## What this record establishes

The workflow was used on a local Flutter application. Two client changes were tested: retaining list subscriptions across local filter changes, and starting two independent reads together while waiting for both before publishing the result. The application's original recordings, test logs, and source remain private. This page summarizes them; it is not a reproducible public benchmark or an independent audit.

The comparison was between two versions of the application. There was no same-model control group performing the task without this skill, so it does not establish a general benefit of the skill over ordinary prompting.

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

## 한국어 요약과 해석 범위

2026-11-02에 실제 Flutter 앱의 두 부분을 비교했습니다. 동호회는 필터를 바꿀 때 기존 데이터 연결을 재사용하도록 바꿨고, 소셜링은 차단 정보와 목록을 함께 조회하되 둘 다 성공한 뒤 표시하도록 바꿨습니다. 2026-11-03 공개 준비에서는 앱 성능을 새로 측정하지 않았습니다.

위 표는 휴대폰 1대·계정 1개에서 기준본과 개선본을 각각 3회 녹화한 값입니다. 소셜링은 결과가 없는 목록이었고, 로딩 시작부터 빈 결과 안내가 돌아올 때까지를 쟀습니다. 손가락의 드래그, 상단 새로고침 표시의 마지막 애니메이션, 사진이 전부 뜨는 시간은 제외했습니다. 원본 영상의 프레임 표시 시각으로 계산했으며 앱 데이터와 캐시는 유지했습니다.

소셜링 중앙값은 930.300ms에서 565.956ms로 약 364ms·39% 감소했습니다. 해당 조건의 특정 구간 결과입니다. 동호회 첫 진입은 약 9ms 차이여서 체감 향상을 단정하기 어렵습니다. 표의 `Not observed`는 녹화에서 별도 로딩 프레임이 보이지 않았다는 뜻이며, 처리 시간이 0이라는 뜻이 아닙니다.

로컬 테스트에서는 200ms와 120ms로 설정한 모의 응답을 순서대로 기다리던 320ms가, 함께 기다리는 200ms로 바뀌었습니다. 필터 두 번 변경과 같은 사용자 알림에 따른 추가 구독도 12회에서 0회로 줄었습니다. 이 값은 실제 서버 응답 시간이나 과금 읽기 횟수가 아닙니다. 주요 비교는 각각 3회 실행했습니다.

나중에 최신 원본에 반영한 뒤에는 Flutter 테스트 216개 통과·기존 제외 1개와 Android 릴리스 빌드 성공을 확인했습니다. 기존 코드의 스타일 안내 1건과 빌드 도구의 향후 지원 종료 안내는 남았습니다. 이 최종 APK의 휴대폰 재측정과 iOS 실행은 하지 않았습니다.

동시 조회에는 비용도 있습니다. 차단 조회가 실패하거나 화면을 닫아도 목록 요청이 이미 진행 중일 수 있습니다. 표시에는 두 조회의 성공이 필요하지만, 기존 순차 방식에서는 보내지 않았을 요청을 한 번 더 보낼 가능성이 있습니다.

앱 소스·원본 녹화·로그는 비공개이므로 외부에서 이 페이지의 수치만으로 앱 동작까지 재현할 수는 없습니다. 독립된 사람의 측정이나 스킬 미사용 대조군도 없습니다. 앱 전체 속도, 다른 앱의 기대 향상률, 서버 비용·메모리·배터리 개선, 스킬 자체의 일반적인 우수성으로 확대해서 해석하지 마세요.
