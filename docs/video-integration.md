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
| `role` | ✅ | 의사·환자·통역(3자 통화) |
| `name` | | 화면 표시 이름 |
| `lang` | | UI 언어 |
| `returnUrl` | | 통화 종료 후 이동할 플랫폼 URL (예: 환자 `/quote/{id}`, 의사 `/clinic/consult/{id}`) |

- 결정 필요: 인증 — 해커톤에서는 sessionId를 추측 불가 값(UUID)으로 쓰는 것으로 대신할지, 서명 토큰을 붙일지.
- 결정 필요: 새 탭 / iframe 임베드 / 컴포넌트 import 중 무엇으로 열지.

## 2. 종료 알림 (video → 플랫폼, 선택)
통화 종료를 플랫폼이 알아야 상태를 `done`으로 바꾼다. 둘 중 하나:
- (A) `returnUrl`로 이동하는 것 자체를 종료 신호로 본다 — 가장 단순, 추천.
- (B) `POST {PLATFORM}/api/video/events` `{ sessionId, event: "ended", durationSec }`.

## 3. 통화 중 화면 (선택)
의사가 통화하면서 환자 사진·문진을 봐야 한다. 방법:
- 의원 콘솔을 띄운 채 video를 새 창으로 연다(연동 없음) — 해커톤 기본값.
- video가 사이드 패널 슬롯을 제공하면 플랫폼이 `/clinic/consult/{id}/panel`을 iframe으로 넣는다.

## 변경 이력
- 2026-10-24 초안
