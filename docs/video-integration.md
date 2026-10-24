# 플랫폼 ↔ 화상통화 연동 계약

> ⚠️ **초안 — 화상 담당 팀원과 합의 필요.** 팀원 구현이 먼저 진행 중이므로, 팀원 쪽 방식과 다르면 이 문서를 팀원 구현에 맞춘다.

## 소유
- `apps/video/` = 팀원 소유. 플랫폼 작업은 이 폴더를 수정하지 않는다.
- 플랫폼은 아래 계약만 사용한다.

## 1. 입장 (플랫폼 → video)
플랫폼이 진료(`consultations`)를 만들 때 `video_session_id`를 발급하고, 환자·의사를 아래 URL로 보낸다.

```
{NEXT_PUBLIC_VIDEO_BASE_URL}/room/{sessionId}?role={patient|doctor}&name={표시이름}&lang={ja|ko}&returnUrl={종료 후 돌아올 URL}
```

| 파라미터 | 필수 | 설명 |
|---|---|---|
| `sessionId` | ✅ | 진료 1건 = 방 1개 |
| `role` | ✅ | `doctor` · `patient` 1:1. 통역은 별도 참가자가 아니라 video 앱의 **자막**으로 제공한다(화상 담당) |
| `name` | | 화면 표시 이름 |
| `lang` | | UI 처음 언어. 통역 언어와는 무관하다 — 통역은 역할로 고정(의사 한국어, 환자 일본어). 환자 화면은 일본어/한국어 전환 버튼이 있고 진료방마다 따로 기억한다([video.md](video.md) §4·§6) |
| `returnUrl` | | 통화 종료 후 이동할 플랫폼 URL (예: 환자 `/jp/quote/{id}`, 의사 `/jp/clinic/consult/{id}?ended=1`) |

- 인증: 서명 토큰 없이 `sessionId` = 추측 불가 UUID(`consultations.video_session_id`)로 대신한다(해커톤).
- 여는 방식: 의사는 의원 콘솔(`/{lang}/clinic/consult/{consultationId}`)에서 **새 탭**, 환자는 `/{lang}/consult/{consultationId}`에서 같은 탭으로 이동.
- 쿼리는 `URLSearchParams`로 인코딩한다(공백 = `+`). video 쪽도 `URLSearchParams`로 읽어야 한다.
- 구현: `apps/web/lib/video.ts` `buildRoomUrl()` — 형식이 바뀌면 이 함수만 고친다.
- returnUrl(절대 URL, 언어 구간 포함 — `docs/i18n.md`): 의사 `/{lang}/clinic/consult/{consultationId}?ended=1`, 환자 `/{lang}/quote/{consultationId}`. `{lang}` = 입장한 화면의 경로 언어(`jp`|`ko`). video는 returnUrl을 그대로 쓰면 된다.
- `lang` 쿼리(video UI 언어)는 `ja|ko` 그대로다 — 경로 값 `jp`와 다르다. 환자는 경로 `jp`→`ja`, `ko`→`ko`, 의사는 `ko`.

- video 앱은 노트북 2대 시연을 위해 HTTPS로 띄운다. `NEXT_PUBLIC_VIDEO_BASE_URL`은 `https://{video 노트북 IP}:3001` 형태가 된다 ([video.md](video.md) §9).

## 2. 종료 알림 (video → 플랫폼, 선택)
통화 종료를 플랫폼이 알아야 상태를 `done`으로 바꾼다. 둘 중 하나:
- **채택: (A)** 의사가 `returnUrl`(`?ended=1`)로 돌아오면 `in_call → done`. 창을 닫아 돌아오지 않은 경우를 위해 콘솔에 수동 "진료 종료" 버튼이 있다.
- ~~(B) `POST {PLATFORM}/api/video/events`~~ — 구현하지 않음.
- 통화 시작: 의사가 "화상 진료 시작"을 누르면 `requested|scheduled → in_call`. 환자 대기 화면(`/consult/{id}`)은 5초 폴링으로 입장 버튼을 켠다.

## 3. 통화 중 화면 (선택)
의사가 통화하면서 환자 사진·문진을 봐야 한다. 방법:
- 의원 콘솔을 띄운 채 video를 새 창으로 연다(연동 없음) — 해커톤 기본값.
- video가 사이드 패널 슬롯을 제공하면 플랫폼이 `/clinic/consult/{id}/panel`을 iframe으로 넣는다.

## 4. 통화 중 추가 촬영 사진 (video → 플랫폼 데이터)
> 기능 설명: [video.md](video.md) §5. ⚠️ H1·H3 확인 필요 — [requests.md](requests.md).

통화 중 의사가 요청하면 환자의 얼굴 정면·좌·우 사진을 찍는다. video 앱 **서버**가 이 사진을 플랫폼과 같은 Supabase에 직접 저장한다(service role, 서버 전용).

- **진료 찾기:** `consultations.video_session_id = sessionId`로 `consultation_id`와 `patient_id`를 얻는다. 해당 진료가 없으면 저장하지 않고 오류로 처리한다.
- **파일:** 플랫폼의 비공개 사진 버킷 **`photos`**의 `call/{consultationId}/{batchId}/{angle}.jpg`에 둔다. JPEG 원본, 좌우 반전 없음.
- **행:** `photos`에 사진 1장당 1행을 넣는다. 기존 컬럼과 추가를 요청한 컬럼은 아래와 같다.

| 컬럼 | 값 | 비고 |
|---|---|---|
| `patient_id` | 진료의 환자 | 기존 |
| `angle` | `front` / `left` / `right` (환자 본인 기준) | 기존 |
| `storage_path` | 위 경로 | 기존 |
| `quality_ok` | 자동 촬영 `true`, 수동 촬영 `false` | 기존 |
| `consultation_id` | 진료 ID | **추가 요청** (nullable — `/photos` 사전 사진은 null) |
| `source` | `intake`(사전, 기본값) / `call`(통화 중) | **추가 요청** |
| `capture_batch_id` | 촬영 회차 UUID (의사가 요청할 때마다 새로 발급) | **추가 요청** |
| `capture_mode` | `auto` / `manual` | **추가 요청** |
| `yaw`, `pitch` | 촬영 시점 고개 각도(도). 수동 촬영 때 얼굴이 없으면 null | **추가 요청** — 이후 경과 비교용 |
| `consented_at` | 환자가 촬영에 동의한 시각 (같은 회차 3행 동일) | **추가 요청** (nullable — `/photos` 사전 사진은 null) |
| `intake_id` | 진료의 `intake_id`(있으면) | 기존 — 귀국 후 경과 비교의 기준 사진으로 쓰기 위해 채운다 |

- 환자가 미리보기 후 제출할 때 한 회차(`capture_batch_id`)의 `front`·`left`·`right` **3행을 한 번에** 넣는다(한 번의 upsert 호출, `onConflict: "capture_batch_id,angle"`). 3장이 안 된 회차는 저장하지 않는다.
- 같은 회차를 다시 제출했는데 이미 3행이 있으면 아무것도 바꾸지 않는다(응답만 끊긴 재전송 대응). 제출된 회차의 사진은 바뀌지 않는다. 3행이 없으면 Storage에 `upsert: true`로 덮어써 이전 실패의 잔여 파일을 정리한 뒤 행을 넣는다.
- 스키마: `supabase/migrations/202610241800_call_capture_symptoms.sql` (H1, 2026-10-24). `source = call` 행은 `consultation_id`·`capture_batch_id`가 없으면 DB가 거부한다.
- 단독 테스트용 고정 진료: 시드의 `video_session_id = 00000000-0000-4000-8000-000000005001` (`lib/demo.ts` `DEMO_VIDEO_SESSION_ID`).
- 의원 콘솔은 `source = call` 사진을 회차별로 묶어 보여 주고, 최신 회차를 먼저 보여 준다(H3). 플랫폼으로 따로 알림은 보내지 않는다. 콘솔은 열람할 때 조회한다.

## 5. 입장 전 장치 점검 (H3 제안 — 화상 담당 수락, 시간이 남으면 만든다)
환자 대기 화면(`/{lang}/consult/{id}`)에 "카메라·마이크 점검" 버튼을 두고 싶다. 플랫폼에서 직접 `getUserMedia`로 점검하지 않는 이유:
- 2노트북 시연에서 환자는 플랫폼을 `http://{IP}:3000`으로 연다 — 비보안 출처라 브라우저가 카메라 API를 막는다.
- 카메라 권한은 출처별이라, 플랫폼에서 허용해도 video 앱(`https://{IP}:3001`)에서 다시 묻는다.

제안: video 앱이 점검 페이지를 제공하고 플랫폼은 새 탭으로 연다.
```
{NEXT_PUBLIC_VIDEO_BASE_URL}/check?lang={ja|ko}&returnUrl={대기 화면 URL}
```
- 카메라 미리보기·마이크 입력 레벨·스피커 테스트음, 권한 거부 시 해결 안내.
- 여기서 권한을 허용해 두면 실제 입장 때 다시 묻지 않는다(같은 출처).
- 플랫폼은 결과를 받지 않는다(연동 없음). 화상 담당이 수락하면 H3가 버튼을 붙인다.

## 6. 소견 일본어 번역 (video 서버 기능 ← 의원 콘솔 브라우저)
> 플랫폼은 소견 번역을 만들지 않는다(사용자 결정, ux-review E4). 화상 담당이 제공한다. 상세: [video.md](video.md) §5.7.

**호출 (H3):** 의사가 콘솔에서 소견(`consultations.notes`)을 저장한 직후, **콘솔 화면(브라우저)**이 아래를 부른다. 서버끼리 부르지 않는다(video는 개발용 인증서라 서버 간 호출이 실패하기 쉽다. 의사 브라우저는 통화 때 인증서를 이미 허용했다).
```
POST {NEXT_PUBLIC_VIDEO_BASE_URL}/api/opinion/translate
Content-Type: application/json
{ "consultationId": "<uuid>" }
```
| 응답 | 의미 |
|---|---|
| `200 { "status": "done" \| "failed" \| "stale" }` | 번역 시도 결과. `stale` = 번역 중 소견이 다시 저장돼 결과를 버림(다음 호출이 새 원문 번역) |
| `400` | `consultationId`가 UUID가 아님 |
| `404` | 진료 없음 |
| `409` | 소견이 비어 있음 |

- CORS: video는 플랫폼 출처(환경변수)를 허용한다.
- 콘솔 표시: `notes_translation_status`를 `번역 중`/`번역 완료`/`번역 실패`로 보이고, 번역이 최신이 아니면(아래 "최신" 조건이 거짓) [다시 번역] → 같은 호출.

**저장 칸 (H1에 추가 요청 — `consultations`)**
| 컬럼 | 값 |
|---|---|
| `notes_ja` | text, nullable — 일본어 번역문 |
| `notes_ja_source` | text, nullable — 번역한 시점의 `notes` 원문 |
| `notes_translation_status` | text, nullable, `pending` / `done` / `failed` — 소견이 없으면 null |

**"최신" 조건:** `notes_translation_status = 'done'` 그리고 `notes_ja_source = notes`.

**환자 견적 화면 (H4):** "医師の所見" 카드에서 일본어 화면이면, 최신이면 `notes_ja` + 「自動翻訳」 + [原文を見る](원문 펼치기). 최신이 아니면 원문 + 「翻訳を準備中です」. 한국어 화면은 원문. → 플랫폼의 소견 저장 코드는 바꾸지 않아도 고치기 전 번역이 보이지 않는다.

## 변경 이력
- 2026-10-24 초안
- 2026-10-24 H3: 인증(UUID)·여는 방식(새 탭)·종료 신호(A)·returnUrl 확정, `lib/video.ts` 구현
- 2026-10-24 H3: 화면 경로가 `/[lang]/...`로 바뀌어 returnUrl에 언어 구간 추가 (`docs/i18n.md`)
- 2026-10-24 H3: 통역 = video 자막(사용자 결정) — `interpreter` 역할 입장·통역 링크 제거
- 2026-10-24 화상 담당(main c7eb74d): §4 통화 중 추가 촬영 추가, HTTPS 실행 메모. `role` 1:1·UUID·새 탭 제안은 H3 확정과 일치해 §1은 H3 문구 유지
- 2026-10-24 H3: §5 입장 전 장치 점검 페이지 제안 (미합의)
- 2026-10-24 화상 담당: `video.md` 통합 문서로 링크 갱신, `lang`에 통역 언어 용도 명시
- 2026-10-24 화상 담당: §4 한 장씩 덮어쓰기 → 회차 3장 일괄 저장으로 변경, `consented_at` 컬럼 추가 요청
- 2026-10-24 화상 담당: §5 점검 화면 수락(시간이 남으면), §6 소견 번역 추가(콘솔 브라우저 호출 + `consultations` 번역 칸 요청), §4 `intake_id` 채움(경과 비교 기준), §1 `lang`은 통역 언어와 무관
