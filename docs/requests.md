# 레인 간 요청

> 형식: `- [요청레인→소유레인] 무엇이 왜 필요한지` · 처리하면 `~~취소선~~ → 처리 커밋`

- [H3→H1] `quotes.items` 항목에 `visit_days: number[]`(체류 N일차, 1부터) 필드를 추가해 쓴다 — 마이그레이션 주석(`items: [{ name, name_ja, sessions, price_krw }]`)과 architecture.md에 반영 요청. jsonb라 스키마 변경은 불필요. `price_krw` = 1회 단가로 해석(seed와 동일)
- ~~[H3→H2] 사진 업로드 완료 시 `consultations`(status=requested, intake_id 포함, doctor_id는 비워도 됨)를 만들고 환자를 `/consult/{consultationId}`로 보내 주세요 — 의원 큐에 신규 요청이 뜨고 환자 화상 대기 화면으로 이어지는 진입점~~ → H2 반영(작업 트리, 커밋 전)
- [H3→H4] 참고: 견적 항목의 `visit_days`(체류 N일차)를 예약 날짜 기본값으로 쓸 수 있음. 환자 통화 종료 returnUrl = `/{lang}/quote/{consultationId}`(H4 현재 구현과 일치)
- [H4→H1] `followups.symptoms text[] not null default '{}'` 컬럼 추가 요청 — 귀국 후 체크인의 증상 자가 체크(赤み·かゆみ 등 고정 키) 저장용. 하나라도 있으면 `alert=true`. 지금은 `patient_note` 첫 줄에 `[symptoms:redness,itch]`로 인코딩하는 임시 우회(`apps/web/app/[lang]/(patient)/aftercare/_components/checkin.ts`)
