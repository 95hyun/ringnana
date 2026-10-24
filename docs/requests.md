# 레인 간 요청

> 형식: `- [요청레인→소유레인] 무엇이 왜 필요한지` · 처리하면 `~~취소선~~ → 처리 커밋`

- ~~[H3→H1] `quotes.items` 항목에 `visit_days: number[]`(체류 N일차, 1부터) 필드를 추가해 쓴다 — 마이그레이션 주석(`items: [{ name, name_ja, sessions, price_krw }]`)과 architecture.md에 반영 요청. jsonb라 스키마 변경은 불필요. `price_krw` = 1회 단가로 해석(seed와 동일)~~ → H1 반영 — architecture.md 데이터 모델
- ~~[H3→H2] 사진 업로드 완료 시 `consultations`(status=requested, intake_id 포함, doctor_id는 비워도 됨)를 만들고 환자를 `/consult/{consultationId}`로 보내 주세요 — 의원 큐에 신규 요청이 뜨고 환자 화상 대기 화면으로 이어지는 진입점~~ → H2 반영(작업 트리, 커밋 전)
- [H3→H4] 참고: 견적 항목의 `visit_days`(체류 N일차)를 예약 날짜 기본값으로 쓸 수 있음. 환자 통화 종료 returnUrl = `/{lang}/quote/{consultationId}`(H4 현재 구현과 일치)
- ~~[H4→H1] `followups.symptoms text[] not null default '{}'` 컬럼 추가 요청 — 귀국 후 체크인의 증상 자가 체크(赤み·かゆみ 등 고정 키) 저장용. 하나라도 있으면 `alert=true`. 지금은 `patient_note` 첫 줄에 `[symptoms:redness,itch]`로 인코딩하는 임시 우회(`apps/web/app/[lang]/(patient)/aftercare/_components/checkin.ts`)~~ → H1 반영 — 202610241800_call_capture_symptoms.sql
- ~~[video→H1] `photos`에 `consultation_id`(nullable), `source`(`intake`/`call`, 기본 `intake`), `capture_batch_id`, `capture_mode`(`auto`/`manual`), `yaw`·`pitch` 컬럼 추가 + 비공개 사진 버킷 이름 공유 — 통화 중 추가 촬영 사진을 플랫폼에 저장하기 위해 (video-integration.md §4)~~ → H1 반영 — 202610241800_call_capture_symptoms.sql, 버킷 `photos` (video-integration.md §4)
- ~~[video→H1] 시드에 `video_session_id`(UUID)가 있는 데모 진료 1건 — video 앱이 sessionId로 진료를 찾아 사진을 저장하기 위해~~ → H1 반영 — `DEMO_VIDEO_SESSION_ID` = 00000000-0000-4000-8000-000000005001 (田中 優子 scheduled 진료)
- [video→H3] 의원 콘솔 사진 열람에서 `source = call` 사진을 회차별(최신 먼저)로 표시 — 통화 후 소견·견적 작성 때 보기 위해
- ~~[video→팀] `scope.md`·`demo-scenario.md`에 장면 4(화상 진료) 안의 "통화 중 추가 촬영" 반영 여부 확인 — 사전 `/photos` 동선은 그대로 둠 (face-capture.md)~~ → 반영(사용자 결정 2026-10-24, scope P0·데모 장면 4·5)
- [video→H1] `photos`에 `consented_at timestamptz`(nullable) 컬럼 추가 — 통화 중 촬영 직전에 받은 동의 시각을 회차 3행에 같은 값으로 저장하기 위해 (video-integration.md §4, video.md §5.2)
- [video→팀] `scope.md`에 P1로 넣은 "실시간 AI 통역"(양방향 자막·음성)의 우선순위와 `demo-scenario.md` 장면 4 반영 여부 확인 (video.md §6)
- [video→H1] `consultations`에 `notes_ja text`, `notes_ja_source text`, `notes_translation_status text check (in ('pending','done','failed'))`(모두 nullable) 추가 — 화상 앱 서버가 소견 일본어 번역을 저장하기 위해 (video-integration.md §6)
- [video→H1] `docs/architecture.md` `photos` 설명과 `202610241800` 마이그레이션 주석의 "재전송은 upsert로 덮어씀"을 "통화 촬영은 회차 3장 일괄 저장, 같은 회차 재제출은 변경 없음"으로 고쳐 주세요 (video-integration.md §4)
- [video→H3] 소견 저장 직후 콘솔 화면(브라우저)에서 `POST {VIDEO_BASE}/api/opinion/translate {consultationId}` 호출 + 번역 상태 표시 + 최신이 아니면 [다시 번역] (video-integration.md §6)
- [video→H4] 환자 견적 "医師の所見": 번역이 최신일 때만(`status=done` 그리고 `notes_ja_source = notes`) `notes_ja` + 「自動翻訳」 + [原文を見る], 아니면 원문 + 「翻訳を準備中です」, 한국어 화면은 원문 (video-integration.md §6)
- [video→H4] 의원 사후관리 비교 기준 사진: 그 진료의 `source = call` 최신 회차 정면 사진을 먼저 쓰고, 없으면 지금 방식(사전 사진) — 표준 사진으로 경과를 비교하기 위해. 통화 사진에는 `intake_id`도 채운다 (video.md §5.6)
- [video→H3] 입장 전 점검 화면 제안 수락 — video가 시간이 남으면 `/check`를 만든다. 생기면 알릴 테니 그때 버튼을 붙여 주세요 (video-integration.md §5)
