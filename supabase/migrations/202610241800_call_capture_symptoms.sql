-- 통화 중 추가 촬영 사진 (docs/video-integration.md §4, docs/face-capture.md)
-- video 앱 서버가 service role로 photos에 직접 넣는다. 기존 /photos 사전 사진은 기본값(source=intake)으로 그대로 동작
alter table photos
  add column consultation_id uuid references consultations (id) on delete set null,
  add column source text not null default 'intake' check (source in ('intake', 'call')),
  add column capture_batch_id uuid,
  add column capture_mode text check (capture_mode in ('auto', 'manual')),
  add column yaw numeric,
  add column pitch numeric,
  add constraint photos_call_has_batch
    check (source <> 'call' or (consultation_id is not null and capture_batch_id is not null)),
  -- 회차당 각도 1장, 재전송은 upsert(onConflict: capture_batch_id,angle)로 덮어쓴다. null 회차(사전 사진)는 제약 대상 아님
  add constraint photos_batch_angle_unique unique (capture_batch_id, angle);

create index on photos (consultation_id, source);

-- 귀국 후 체크인 증상 자가 체크 (고정 키, H4). 하나라도 있으면 앱이 alert=true
alter table followups
  add column symptoms text[] not null default '{}';
