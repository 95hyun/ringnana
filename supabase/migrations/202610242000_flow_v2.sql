-- 유저 플로우 v2: 의사 탐색 → 프로필 → 상담 시간 예약 → 문진 → 신청 → 의사 수락 (.specs/flow-v2/spec.md)

-- 의원: 탐색 필터(지역)와 프로필 표시용. area 코드는 사전(common)에서 이름으로 바꾼다
alter table clinics
  add column area text,
  add column address_ja text,
  add column station text,
  add column station_ja text;

-- 의사: specialties = 문진 고민 코드(lib/intake.ts CONCERN_KEYS) 재사용, languages = 상담 가능 언어(ja·ko·en)
alter table doctors
  add column specialties text[] not null default '{}',
  add column languages text[] not null default '{ko}',
  add column title text,
  add column title_ja text,
  add column bio text,
  add column bio_ja text,
  add column photo_path text;

-- 상담 가능 시간. 신청(requested) 시 booked, 거절·취소 시 open으로 되돌린다(앱에서)
create table doctor_slots (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references doctors (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'open' check (status in ('open', 'booked')),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  unique (doctor_id, starts_at)
);
create index on doctor_slots (starts_at, status);
alter table doctor_slots enable row level security;

-- 진료: 예약 시간 연결 + 신청·결정 기록. draft = 시간을 고르고 문진 작성 중(슬롯 점유 안 함)
alter table consultations
  add column slot_id uuid references doctor_slots (id) on delete set null,
  add column requested_at timestamptz,
  add column decided_at timestamptz,
  add column decline_reason text;
alter table consultations drop constraint consultations_status_check;
alter table consultations add constraint consultations_status_check
  check (status in ('draft', 'requested', 'scheduled', 'in_call', 'done', 'declined', 'cancelled'));
