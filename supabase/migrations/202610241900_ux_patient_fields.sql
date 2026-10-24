-- UX 리뷰 반영 (docs/ux-review.md A6·B1·C6)
-- A6: 의원 콘솔이 읽을 수 있는 로마자 이름 (예: Takahashi Emi). 콘솔 표기 = lib/localize.ts patientName()
alter table patients
  add column name_latin text,
  -- B1: 가입 시 필수 동의 3종(이용약관·민감정보 수집·국외 이전)을 모두 받은 시각. 3종 모두 필수라 시각 하나로 기록
  add column consented_at timestamptz;

-- C6: AI 시술 기대 이미지(H2 /photos)를 의사 화면에서 보도록 photos에 저장 — angle = preview
alter table photos drop constraint photos_angle_check;
alter table photos add constraint photos_angle_check
  check (angle in ('front', 'left', 'right', 'followup', 'preview'));
