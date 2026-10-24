# 플랫폼 ↔ 화상통화 연동 계약

> ⚠️ **초안 — 화상 담당 팀원과 합의 필요.** 팀원 구현이 먼저 진행 중이므로, 팀원 쪽 방식과 다르면 이 문서를 팀원 구현에 맞춘다.

## 소유
- `apps/video/` = 팀원 소유. 플랫폼 작업은 이 폴더를 수정하지 않는다.
- 플랫폼은 아래 계약만 사용한다.

## 1. 입장 (플랫폼 → video)
플랫폼이 진료(`consultations`)를 만들 때 `video_session_id`를 발급하고, 환자·의사를 아래 URL로 보낸다.

```
{NEXT_PUBLIC_VIDEO_BASE_URL}/room/{sessionId}?role={patient|doctor|interpreter}&name={표시이름}&lang={ja|ko}&returnUrl={종료 후 돌아올 URL}
```

| 파라미터 | 필수 | 설명 |
|---|---|---|
| `sessionId` | ✅ | 진료 1건 = 방 1개 |
| `role` | ✅ | 의사·환자·통역(3자 통화). **데모는 `doctor`·`patient` 1:1만 지원**, `interpreter`는 추후 |
| `name` | | 화면 표시 이름 |
| `lang` | | UI 언어 |
| `returnUrl` | | 통화 종료 후 이동할 플랫폼 URL (예: 환자 `/quote/{id}`, 의사 `/clinic/consult/{id}`) |

- 결정 필요: 인증 — 해커톤에서는 sessionId를 추측 불가 값(UUID)으로 쓰는 것으로 대신할지, 서명 토큰을 붙일지. (화상 담당 제안: UUID로 대신)
- 결정 필요: 새 탭 / iframe 임베드 / 컴포넌트 import 중 무엇으로 열지. (화상 담당 제안: 새 탭 — 카메라 권한·HTTPS 처리가 단순)
- video 앱은 노트북 2대 시연을 위해 HTTPS로 띄운다. `NEXT_PUBLIC_VIDEO_BASE_URL`은 `https://{video 노트북 IP}:3001` 형태가 된다 ([face-capture.md](face-capture.md) §7).

## 2. 종료 알림 (video → 플랫폼, 선택)
통화 종료를 플랫폼이 알아야 상태를 `done`으로 바꾼다. 둘 중 하나:
- (A) `returnUrl`로 이동하는 것 자체를 종료 신호로 본다 — 가장 단순, 추천.
- (B) `POST {PLATFORM}/api/video/events` `{ sessionId, event: "ended", durationSec }`.

## 3. 통화 중 화면 (선택)
의사가 통화하면서 환자 사진·문진을 봐야 한다. 방법:
- 의원 콘솔을 띄운 채 video를 새 창으로 연다(연동 없음) — 해커톤 기본값.
- video가 사이드 패널 슬롯을 제공하면 플랫폼이 `/clinic/consult/{id}/panel`을 iframe으로 넣는다.

## 4. 통화 중 추가 촬영 사진 (video → 플랫폼 데이터)
> 기능 설명: [face-capture.md](face-capture.md). ⚠️ H1·H3 확인 필요 — [requests.md](requests.md).

통화 중 의사가 요청하면 환자의 얼굴 정면·좌·우 사진을 찍는다. video 앱 **서버**가 이 사진을 플랫폼과 같은 Supabase에 직접 저장한다(service role, 서버 전용).

- **진료 찾기:** `consultations.video_session_id = sessionId`로 `consultation_id`와 `patient_id`를 얻는다. 해당 진료가 없으면 저장하지 않고 오류로 처리한다.
- **파일:** 플랫폼의 비공개 사진 버킷(이름은 H1이 정함)의 `call/{consultationId}/{batchId}/{angle}.jpg`에 둔다. JPEG 원본, 좌우 반전 없음.
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
| `yaw`, `pitch` | 촬영 시점 고개 각도(도) | **추가 요청** — 이후 경과 비교용 |

- 한 회차(`capture_batch_id`)에는 각 `angle`이 최대 1장이다. 같은 각도를 다시 보내면 덮어쓴다(재전송 대응).
- 의원 콘솔은 `source = call` 사진을 회차별로 묶어 보여 주고, 최신 회차를 먼저 보여 준다(H3). 플랫폼으로 따로 알림은 보내지 않는다. 콘솔은 열람할 때 조회한다.

## 변경 이력
- 2026-10-24 초안
- 2026-10-24 화상 담당: §4 통화 중 추가 촬영 추가, 데모 1:1 명시, 인증·열기 방식 제안
