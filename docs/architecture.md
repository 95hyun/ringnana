# 아키텍처

> 해커톤 기준. 단순함 > 확장성. 서버 하나(Next.js) + Supabase 하나로 끝낸다.

## 스택
| 영역 | 선택 | 비고 |
|---|---|---|
| 프레임워크 | Next.js (App Router) + TypeScript | `apps/web` |
| UI | Tailwind CSS + shadcn/ui | 모바일 우선(환자), 데스크톱(의원 콘솔) |
| DB·인증·파일 | Supabase (Postgres, Auth, Storage) | 피부 사진은 Storage private 버킷 |
| 배포 | Vercel | 데모 URL용 |
| 화상통화 | 팀원 구현 (`apps/video`) | [video-integration.md](video-integration.md) |
| i18n | 환자 화면 일본어 고정 | 다국어 프레임워크는 도입하지 않는다(해커톤) |

## 폴더 (apps/web, 예정)
```
apps/web/
├── app/
│   ├── (patient)/          # 환자 앱 — 일본어
│   │   ├── page.tsx              # 랜딩
│   │   ├── intake/               # 문진(금기 스크리닝)
│   │   ├── photos/               # 표준 사진 촬영 가이드·업로드
│   │   ├── consult/[id]/         # 화상 진료 대기·입장 → video 앱으로
│   │   ├── quote/[id]/           # 확정 견적 확인·예약
│   │   └── aftercare/            # 귀국 후 체크인
│   ├── clinic/             # 의원 콘솔 — 한국어
│   │   ├── page.tsx              # 진료 큐
│   │   ├── consult/[id]/         # 환자 문진·사진 열람 + 화상 입장 + 소견·견적 작성
│   │   └── aftercare/            # 체크인 검토
│   └── api/                # 필요한 경우만 (video 콜백 등)
├── components/
├── lib/
│   ├── supabase/           # 클라이언트·서버 헬퍼
│   ├── intake.ts           # 금기 플래그 규칙
│   └── video.ts            # video 앱 URL 생성 (계약 구현)
└── seed/                   # 가상 환자·의원 데이터
```

## 데이터 모델 (초안)
| 테이블 | 주요 컬럼 | 비고 |
|---|---|---|
| `clinics` | id, name, name_ja, address | 제휴 유치의료기관 |
| `doctors` | id, clinic_id, user_id, name, specialty | 피부과 전문의 |
| `patients` | id, user_id, name, country, lang, birth_year | 데모는 country=JP |
| `intakes` | id, patient_id, concerns[], contraindications(jsonb), flags[], trip_start, trip_end | 금기 플래그는 `lib/intake.ts`가 계산 |
| `photos` | id, patient_id, angle(front/left/right), storage_path, quality_ok | |
| `consultations` | id, patient_id, doctor_id, status, scheduled_at, video_session_id, notes | status: `requested → scheduled → in_call → done` |
| `quotes` | id, consultation_id, items(jsonb: 시술·회차·가격), total_krw, valid_until, status | 의사가 작성, 확정 후 변경 불가 |
| `bookings` | id, quote_id, clinic_id, visit_dates[], status | 체류 일정에 맞춘 회차 |
| `followups` | id, booking_id, due_day(3/14/30), status, photo_id, patient_note, doctor_note, alert | 이상 신호면 alert=true |

- RLS: 환자는 자기 행만, 의사는 자기 의원의 행만. 해커톤에서 막히면 서버에서 service role로 처리하고 TODO를 남긴다.
- 스키마는 `supabase/migrations/`에 SQL로 둔다.

## 환경변수
`.env.example` 참조. `NEXT_PUBLIC_VIDEO_BASE_URL` = 화상 앱 주소.
