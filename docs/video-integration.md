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
| `lang` | | UI 언어 |
| `returnUrl` | | 통화 종료 후 이동할 플랫폼 URL (예: 환자 `/jp/quote/{id}`, 의사 `/jp/clinic/consult/{id}?ended=1`) |

- 인증: 서명 토큰 없이 `sessionId` = 추측 불가 UUID(`consultations.video_session_id`)로 대신한다(해커톤).
- 여는 방식: 의사는 의원 콘솔(`/{lang}/clinic/consult/{consultationId}`)에서 **새 탭**, 환자는 `/{lang}/consult/{consultationId}`에서 같은 탭으로 이동.
- 쿼리는 `URLSearchParams`로 인코딩한다(공백 = `+`). video 쪽도 `URLSearchParams`로 읽어야 한다.
- 구현: `apps/web/lib/video.ts` `buildRoomUrl()` — 형식이 바뀌면 이 함수만 고친다.
- returnUrl(절대 URL, 언어 구간 포함 — `docs/i18n.md`): 의사 `/{lang}/clinic/consult/{consultationId}?ended=1`, 환자 `/{lang}/quote/{consultationId}`. `{lang}` = 입장한 화면의 경로 언어(`jp`|`ko`). video는 returnUrl을 그대로 쓰면 된다.
- `lang` 쿼리(video UI 언어)는 `ja|ko` 그대로다 — 경로 값 `jp`와 다르다. 환자는 경로 `jp`→`ja`, `ko`→`ko`, 의사는 `ko`.

## 2. 종료 알림 (video → 플랫폼, 선택)
통화 종료를 플랫폼이 알아야 상태를 `done`으로 바꾼다. 둘 중 하나:
- **채택: (A)** 의사가 `returnUrl`(`?ended=1`)로 돌아오면 `in_call → done`. 창을 닫아 돌아오지 않은 경우를 위해 콘솔에 수동 "진료 종료" 버튼이 있다.
- ~~(B) `POST {PLATFORM}/api/video/events`~~ — 구현하지 않음.
- 통화 시작: 의사가 "화상 진료 시작"을 누르면 `requested|scheduled → in_call`. 환자 대기 화면(`/consult/{id}`)은 5초 폴링으로 입장 버튼을 켠다.

## 3. 통화 중 화면 (선택)
의사가 통화하면서 환자 사진·문진을 봐야 한다. 방법:
- 의원 콘솔을 띄운 채 video를 새 창으로 연다(연동 없음) — 해커톤 기본값.
- video가 사이드 패널 슬롯을 제공하면 플랫폼이 `/clinic/consult/{id}/panel`을 iframe으로 넣는다.

## 변경 이력
- 2026-10-24 초안
- 2026-10-24 H3: 인증(UUID)·여는 방식(새 탭)·종료 신호(A)·returnUrl 확정, `lib/video.ts` 구현
- 2026-10-24 H3: 화면 경로가 `/[lang]/...`로 바뀌어 returnUrl에 언어 구간 추가 (`docs/i18n.md`)
- 2026-10-24 H3: 통역 = video 자막(사용자 결정) — `interpreter` 역할 입장·통역 링크 제거
