-- Ringnana 초기 스키마 (docs/architecture.md 데이터 모델)
-- 접근 방식: 로그인 없음, 서버에서 service role로만 접근. RLS는 켜되 정책 없음 = anon·authenticated 전부 거부.
-- TODO: Auth 도입 시 환자=자기 행, 의사=자기 의원 행 정책 추가

create table clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_ja text not null,
  address text,
  created_at timestamptz not null default now()
);

create table doctors (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics (id) on delete cascade,
  user_id uuid,
  name text not null,
  name_ja text,
  specialty text,
  created_at timestamptz not null default now()
);

create table patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text not null,
  country text not null default 'JP',
  lang text not null default 'ja',
  birth_year int,
  created_at timestamptz not null default now()
);

-- contraindications: 문진 응답 원본(jsonb), flags: lib/intake.ts가 계산한 금기 플래그
create table intakes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients (id) on delete cascade,
  concerns text[] not null default '{}',
  contraindications jsonb not null default '{}',
  flags text[] not null default '{}',
  trip_start date,
  trip_end date,
  created_at timestamptz not null default now(),
  check (trip_end is null or trip_start is null or trip_end >= trip_start)
);

-- angle=followup은 귀국 후 체크인 사진
create table photos (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients (id) on delete cascade,
  intake_id uuid references intakes (id) on delete set null,
  angle text not null check (angle in ('front', 'left', 'right', 'followup')),
  storage_path text not null,
  quality_ok boolean,
  created_at timestamptz not null default now()
);

-- video_session_id: 추측 불가 UUID = 화상 방 키 (docs/video-integration.md)
create table consultations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients (id) on delete cascade,
  doctor_id uuid references doctors (id) on delete set null,
  intake_id uuid references intakes (id) on delete set null,
  status text not null default 'requested'
    check (status in ('requested', 'scheduled', 'in_call', 'done')),
  scheduled_at timestamptz,
  video_session_id uuid not null unique default gen_random_uuid(),
  notes text,
  created_at timestamptz not null default now()
);

-- items: [{ name, name_ja, sessions, price_krw }]. confirmed 이후 변경 불가는 앱에서 지킨다
create table quotes (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references consultations (id) on delete cascade,
  items jsonb not null default '[]',
  total_krw int not null default 0 check (total_krw >= 0),
  valid_until date,
  status text not null default 'draft'
    check (status in ('draft', 'confirmed', 'accepted')),
  created_at timestamptz not null default now()
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes (id) on delete cascade,
  clinic_id uuid not null references clinics (id) on delete cascade,
  visit_dates date[] not null default '{}',
  status text not null default 'reserved'
    check (status in ('reserved', 'done')),
  created_at timestamptz not null default now()
);

create table followups (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings (id) on delete cascade,
  due_day int not null check (due_day in (3, 14, 30)),
  status text not null default 'pending'
    check (status in ('pending', 'submitted', 'reviewed')),
  photo_id uuid references photos (id) on delete set null,
  patient_note text,
  doctor_note text,
  alert boolean not null default false,
  created_at timestamptz not null default now(),
  unique (booking_id, due_day)
);

create index on doctors (clinic_id);
create index on intakes (patient_id);
create index on photos (patient_id);
create index on consultations (doctor_id, status);
create index on consultations (patient_id);
create index on quotes (consultation_id);
create index on bookings (quote_id);
create index on followups (booking_id);

alter table clinics enable row level security;
alter table doctors enable row level security;
alter table patients enable row level security;
alter table intakes enable row level security;
alter table photos enable row level security;
alter table consultations enable row level security;
alter table quotes enable row level security;
alter table bookings enable row level security;
alter table followups enable row level security;

-- 피부 사진 = private 버킷. 열람은 서버가 signed URL 발급
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;
