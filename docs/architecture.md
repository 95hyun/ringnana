# 아키텍처

> 해커톤 기준. 단순함 > 확장성. 서버 하나(Next.js) + Supabase 하나로 끝낸다.

## 스택
| 영역 | 선택 | 비고 |
|---|---|---|
| 프레임워크 | Next.js 16.4 (App Router, Turbopack) + React 19.3 + TypeScript | `apps/web`, Cache Components 켜짐(아래 "데이터 읽기") |
| UI | Tailwind CSS v4 + shadcn/ui (style `base-nova`, Base UI 기반) | 모바일 우선(환자), 데스크톱(의원 콘솔) |
| DB·파일 | Supabase (Postgres 17, Storage) — 로컬 Docker | 피부 사진은 Storage private 버킷 `photos`. 클라우드는 배포 때 link·push |
| 인증 | 환자만 Supabase Auth 이메일+비밀번호 → 서명 쿠키 세션 | 의사는 로그인 없음(`DEMO_DOCTOR_ID`). 아래 "인증" |
| 외부 API | bbanana.ai (`https://www.bbanana.ai/v1`) | 셀카 → 시술 기대 이미지 (H2). 서버 전용 키 `BBANANA_API_KEY` |
| 배포 | Vercel | 데모 URL용 (클라우드 Supabase 연결 후) |
| 화상통화 | 팀원 구현 (플랫폼 앱 안 `/video`, 코드 `apps/web/video`) | [video-integration.md](video-integration.md) |
| i18n | `/[lang]/` 경로 + 레인별 사전 파일 ([i18n.md](i18n.md)) | 라이브러리 없이 Next.js 기본 패턴. 값: `jp`(기본)·`ko` |
| 폰트 | Noto Sans JP(기본 `--font-sans`), Noto Sans KR(`--font-kr`, 의원 셸) | `app/layout.tsx` |

> Next 16은 학습 데이터와 API가 다르다. 코드를 쓰기 전 `apps/web/node_modules/next/dist/docs/`를 확인한다 (`apps/web/AGENTS.md`).

## 폴더 (apps/web)
사용자 화면은 전부 `app/[lang]/` 아래다 — 경로·사전 규칙은 [i18n.md](i18n.md)가 정본. 루트 레이아웃이 `[lang]`·`dev` 두 개라 `app/layout.tsx`는 없다(둘 다 `RootHtml` 사용, 두 루트를 오가면 전체 페이지 로드).
```
apps/web/
├── proxy.ts                # 언어 없는 경로 → /jp/... 리다이렉트 (/api·/dev·정적 파일 제외) (H1)
├── app/
│   ├── [lang]/             # jp(기본, html lang=ja) · ko
│   │   ├── layout.tsx            # 루트: RootHtml + lang 검증·generateStaticParams (H1)
│   │   ├── (patient)/            # 환자 앱
│   │   │   ├── layout.tsx            # PatientShell (H1)
│   │   │   ├── page.tsx              # 랜딩 (H2)
│   │   │   ├── login/                # 이메일+비밀번호, 세션 _lib/session.ts (H2)
│   │   │   ├── intake/               # 문진(금기 스크리닝) (H2)
│   │   │   ├── photos/               # 셀카 → AI 시술 기대 이미지 (H2)
│   │   │   ├── consult/[id]/         # 화상 진료 대기·입장 → video 앱으로 (H3)
│   │   │   ├── quote/[id]/           # 확정 견적 확인·예약 (H4) — id = consultation id (견적 id 아님)
│   │   │   ├── aftercare/            # 귀국 후 체크인 (H4)
│   │   │   └── legal/[doc]/          # terms·privacy·tokushoho 페이지 틀 (H1, 문구 dictionaries/*/legal.ts)
│   │   └── clinic/               # 의원 콘솔 (문구는 jp 경로에서도 한국어 가능)
│   │       ├── layout.tsx            # ClinicShell (H3)
│   │       ├── page.tsx              # 진료 큐 (H3)
│   │       ├── consult/[id]/         # 문진·사진 열람 + 화상 입장 + 소견·견적 작성 (H3)
│   │       └── aftercare/            # 체크인 검토 (H4)
│   ├── dev/                # 루트: H1 확인용 DB 연결·시드·셸 미리보기 (언어 구간 밖, production에선 /dev 404)
│   └── api/                # 필요한 경우만 (언어 구간 밖)
├── components/
│   ├── ui/                 # shadcn (H1이 추가)
│   ├── ui/ 추가분           # disclaimer-bar·loading-card·sample-image (H1, design.md §5·§7)
│   └── shell/              # RootHtml·PatientShell·ClinicShell·LangSwitcher·PatientStepper·SiteFooter·PatientWideLayout (H1)
├── dictionaries/{jp,ko}/   # common.ts·legal.ts·index.ts(H1) · h2.ts~h4.ts(각 레인). ko는 satisfies typeof jp
├── lib/
│   ├── supabase/
│   │   ├── server.ts             # supabaseServer() — service role, server-only
│   │   ├── storage.ts            # uploadPhoto·signedPhotoUrl(s)·photoPath
│   │   └── database.types.ts     # pnpm db:types 생성물 (손대지 않음)
│   ├── i18n.ts             # LANGS·isLang·htmlLang·href·getDict (H1)
│   ├── localize.ts         # localized·treatmentName·patientName (H1)
│   ├── market.ts           # 시장(국가·표시 통화·시간대·환율) — 언어와 별개 (H1)
│   ├── format.ts           # Intl 날짜·시각·통화, formatAppointment(현지+KST), formatQuotePrice, fill (H1)
│   ├── demo.ts             # 데모 고정 ID·페르소나 계정 (H1)
│   ├── utils.ts            # cn (shadcn)
│   ├── intake.ts           # 금기 플래그 규칙 (H2)
│   └── video.ts            # video 앱 URL 생성 (H3)
└── seed/                   # index.ts(가상 데이터) + assets/(플레이스홀더 사진)
```
- 서버 컴포넌트에서 현재 언어: `params.lang` 또는 `import { lang } from "next/root-params"`(Server Action·Route Handler 불가 → hidden 필드 등으로 넘긴다). 둘 다 `isLang()`으로 검증한다.

## 데이터 접근 규칙
- DB·Storage는 서버(서버 컴포넌트·Server Action·Route Handler)에서 `supabaseServer()`로만 접근한다. 브라우저 Supabase 클라이언트는 없다 — 클라이언트 컴포넌트는 Server Action을 호출한다.
- RLS는 전 테이블 켜져 있고 정책이 없다 = anon 키로는 아무것도 못 읽고 못 쓴다. `SUPABASE_SERVICE_ROLE_KEY`는 `server-only`로 클라이언트 번들 유입을 막는다. `NEXT_PUBLIC_`를 붙이지 않는다.
- 고정 ID = `lib/demo.ts`: `DEMO_PATIENT_ID`(佐藤 美咲), `DEMO_DOCTOR_ID`, `DEMO_CLINIC_ID`, `DEMO_AFTERCARE_BOOKING_ID`.

## 공통 UI (H1) — 정본 [design.md](design.md)
- 토큰: `app/globals.css` `:root` = design.md §2-3 그대로(라이트만). 커스텀 Tailwind 색: `primary-hover`·`primary-tint`·`blush`·`blush-tint`·`warning`·`warning-foreground`·`warning-tint`·`warning-border`·`danger`(체크인 응급 카드 전용)·`surface`·`border-strong`·`ai-border`·`disclaimer-bg`. **shadcn `secondary` = blush(환자 색)** — 중립 상태에는 `outline`·`ghost`·`muted`를 쓴다. 금기·보류 = warning 계열, 빨강 금지.
- 폰트: Inter + Noto Sans JP(400·500·600), ko 화면은 `font-ko`(Inter + Noto Sans KR). 본문 15px, jp(html lang=ja) 행간 1.7. lucide 선 굵기 1.75(전역 CSS).
- 형태: 카드 `rounded-xl`(12px)·border·shadow-sm, 버튼·입력 `rounded-lg`(10px)·높이 44px, 배지 999px.
- `components/ui/`: Button `default`(Primary)·`outline`·`ghost` · Badge `role-patient`·`role-doctor`·`ai-label`·`doctor-confirmed`·`flag-high`·`flag-medium`·`hold` · `DisclaimerBar`(children = `common.disclaimer`) · `LoadingCard`(steps·caption prop, 페이드 200ms) · `SampleImage`(4:5 cover + 좌하단 라벨, `common.sampleImage`/`common.aiLabel`).
- 셸: 헤더 64px, 워드마크 Ringnana(Inter 18/600), 우측 언어 스위처 + 역할 배지(환자 blush / 의사 primary) + 데모용 환자↔의원 화면 전환. 모바일은 JA/KO 축약.
- 환자 2단: `<PatientWideLayout left right />`(`components/shell/patient-wide.tsx`, 좌7/우5, 최대 1200px). 이게 있는 페이지만 PatientShell이 넓어진다(랜딩·필요 화면). 390px에서는 1단.
- 푸터: PatientShell 하단 `SiteFooter`(운영사·등록번호·제휴 의원·문의·약관 링크, 전부 가상). 약관 링크 = `href(lang, "/legal/terms|privacy|tokushoho")`.
- 환자 스테퍼: `<PatientStepper lang={lang} current="intake|photos|consult|quote|aftercare" />`를 각 화면 상단에 넣는다(서버 컴포넌트).

## 시장·형식 (`lib/market.ts`, `lib/format.ts`)
- **언어 ≠ 시장.** 경로 값(jp/ko)은 보는 언어, 시장은 `ACTIVE_MARKET`(지금 JP: 표시 통화 JPY, 시간대 Asia/Tokyo, 참고 환율 1곳 + 기준일). `/ko`로 봐도 대상 시장은 일본이다.
- 사전 분리 기준: **사전에는 "어떤 언어로 말할지"만 둔다.** 국가명·통화·시간대·환율처럼 시장이 바뀌면 달라지는 값은 문구에 박지 말고 `{country}`·`{amount}` 자리표시자로 두고 market에서 채운다(국가명 = `common.countries[market.country]`). 예) ✗ "日本にいるうちに" → ✓ "{country}にいるうちに".
- 의원 쪽 고정값: `CLINIC_CURRENCY`=KRW(확정가), `CLINIC_TIME_ZONE`=Asia/Seoul.
- 표시 함수: `formatDate`·`formatDateShort`·`formatTime`·`formatDateTime`(날짜 전용 "YYYY-MM-DD"는 시간대 이동 없음), `formatAppointment`(진료 시각, 현지+KST — 시차 없으면 한 번만), `formatMoney`, `formatQuotePrice`(시장 통화 참고가 크게 + KRW 확정가 + 환율 기준일), `fill`(사전 자리표시자). 화면에서 `toLocaleString`·환율 상수를 직접 쓰지 않는다.

## DB 데이터 현지화 (`lib/localize.ts`)
- `localized(row, lang, field = "name")`: 다국어 컬럼 규칙 = 기본 컬럼(`name`) 한국어, `name_ja` 일본어. 화면에서 `name_ja ?? name`을 직접 쓰지 않는다.
- 시술: `treatmentName(item, lang, dict)` — `code`가 있으면 `dictionaries/*/common.ts`의 `treatments`, 없으면 `localized(item)`. 코드 추가 = TREATMENT_CODES + 양쪽 사전.
- 의원 콘솔 환자 이름: `patientName(p)` → `Takahashi Emi (高橋 恵美)` (name_latin 없으면 name).

## 인증 (환자만)
- 가입: 서버에서 `auth.admin.createUser({ email, password, email_confirm: true })` → `patients.user_id` 연결. 이메일 확인 설정은 바꾸지 않는다.
- 로그인: 비밀번호를 Supabase Auth로 검증한 뒤, Supabase 토큰 대신 `patientId`를 HMAC 서명한 httpOnly 쿠키 `rn_patient`(7일)를 세운다 — 데모 도중 토큰 만료가 없다. 서명 키 = `SESSION_SECRET`(service role 키와 분리).
- 현재 환자: `currentPatientId()`·`requirePatient(next)` — 구현 `app/(patient)/login/_lib/session.ts` (H2 소유). 미로그인이면 `/login?next=…`.
- DB 접근은 로그인 여부와 무관하게 여전히 `supabaseServer()`(service role)만 쓴다. RLS 정책은 없다.
- 데모 계정: `misaki@ringnana.demo` / `ringnana` = `DEMO_PATIENT_ID`(시드가 생성). 의사 측은 로그인 없이 `DEMO_DOCTOR_ID`.
- 사진: 버킷 `photos`(private). 경로 — 플랫폼 업로드 `patients/{patientId}/{uuid}.{ext}`, 통화 중 촬영(video 앱) `call/{consultationId}/{batchId}/{angle}.jpg`. 업로드는 `uploadPhoto(patientId, file, { ext, contentType })` → `storage_path`를 `photos` 행에 저장. 화면 표시는 `signedPhotoUrl(s)`로 1시간짜리 URL을 받아 `<img>`로 (signed URL은 `next/image` 최적화 대상 아님).
- **데이터 읽기 (Cache Components)**: DB 읽기는 기본이 요청 시점 실행이다. DB를 읽는 async 컴포넌트는 `<Suspense>`로 감싸고, 읽기 전에 `await connection()`(`next/server`)을 부른다 — 예시 `app/dev/page.tsx`. 막히면 해당 page에 `export const instant = false`. `new Date()`·`crypto.randomUUID()`를 prerender 구간에서 부르면 빌드가 깨진다.
- 쓰기 후 화면 갱신은 Server Action에서 `revalidatePath`/`refresh` (Next 16 문서 `01-getting-started/07-mutating-data.md`).
- supabase-js 다건 insert에서 행마다 키가 다르면 빠진 키가 null로 들어간다 — 기본값 있는 not null 컬럼도 명시한다.

## 데이터 모델
정본은 `supabase/migrations/`. 타입은 `lib/supabase/database.types.ts` (`Tables<"patients">` 등).

| 테이블 | 주요 컬럼 | 비고 |
|---|---|---|
| `clinics` | id, name, name_ja, address | 제휴 유치의료기관 |
| `doctors` | id, clinic_id, user_id?, name, name_ja, specialty | 피부과 전문의 |
| `patients` | id, user_id?, name, name_latin?, consented_at?, country, lang, birth_year | 데모는 country=JP. name_latin = 로마자(의원 콘솔 표기), consented_at = 가입 필수 동의 3종 시각 |
| `intakes` | id, patient_id, concerns text[], contraindications jsonb, flags text[], trip_start, trip_end | 금기 플래그는 `lib/intake.ts`가 계산 |
| `photos` | id, patient_id, intake_id?, angle, storage_path, quality_ok, consultation_id?, source, capture_batch_id?, capture_mode?, yaw?, pitch? | angle: `front`·`left`·`right`·`followup`(체크인 사진)·`preview`(AI 시술 기대 이미지, H2). source: `intake`(기본, 사전·셀카) / `call`(통화 중 촬영, video 앱 서버가 저장 — consultation_id·capture_batch_id 필수). capture_mode: `auto`/`manual`. (capture_batch_id, angle) unique → 재전송은 upsert로 덮어씀 ([video-integration.md](video-integration.md) §4) |
| `consultations` | id, patient_id, doctor_id, intake_id, status, scheduled_at, video_session_id, notes | status: `requested → scheduled → in_call → done`. `video_session_id` = 기본값 랜덤 UUID(화상 방 키) |
| `quotes` | id, consultation_id, items jsonb, total_krw, valid_until, status | items: `[{ code?, name, name_ja, sessions, price_krw, visit_days? }]` — code = 시술 코드(`lib/localize.ts` TREATMENT_CODES, 자유 입력 항목은 없음) — price_krw = 1회 단가, visit_days = 체류 N일차(1부터) 배열(H3). status: `draft → confirmed → accepted`. confirmed 이후 변경 불가(앱에서 지킴) |
| `bookings` | id, quote_id, clinic_id, visit_dates date[], status | status: `reserved → done` |
| `followups` | id, booking_id, due_day(3/14/30), status, photo_id, patient_note, doctor_note, alert, symptoms text[] | status: `pending → submitted → reviewed`. symptoms = 증상 자가 체크 고정 키(H4), 하나라도 있으면 alert=true. (booking_id, due_day) unique |

- 모든 테이블에 `created_at`. 상태값은 enum 타입이 아니라 `text + check` — 값 추가는 새 마이그레이션.
- 시드가 쓰는 초기 코드값 (H2가 `lib/intake.ts`에서 라벨을 정의, 바꾸려면 `docs/requests.md`로 시드 수정 요청):
  - concerns: `melasma`(기미/シミ), `acne_scar`, `pores`, `redness`, `wrinkles`
  - contraindications 키·flags: `pregnant`, `isotretinoin`, `anticoagulant`, `keloid`, `recent_sunburn`
- 견적 통화: DB는 KRW. 화면 표기 통화는 H4 결정.

## 시드 (가상 인물)
- 의원 1(링나나 피부과의원), 의사 1(김서연), 데모 페르소나 佐藤 美咲(1997년생, 새 문진 전 상태, Auth 계정 `misaki@ringnana.demo` / `ringnana`).
- 시드는 로컬 Auth 사용자도 전부 지운다(가입 테스트 계정 포함).
- 진료 큐: 가상 환자 3명 — 문진·사진 3장·진료(`scheduled` 1, `requested` 2, 한 명은 `anticoagulant` 플래그). `scheduled` 진료(田中 優子)의 `video_session_id` = `DEMO_VIDEO_SESSION_ID`(`00000000-0000-4000-8000-000000005001`, 화상 앱 단독 테스트용).
- 데모 7번 장면: 페르소나의 지난 방한 흐름 — 진료 `done` → 견적 `accepted`(피코토닝 2회, 300,000원) → 예약 `done`(시술일 = 시드 실행일 −16·−14일) → followup D+3 `reviewed`(사진 포함)·D+14 `pending`·D+30 `pending`. 날짜는 시드 실행일 기준이라 **데모 당일 다시 시드하면 오늘이 D+14**다.
- 사진은 실제 피부 사진이 아니라 `seed/assets/` 플레이스홀더.

## 로컬 실행
`apps/web/README.md` 참고. 요약: `pnpm install` → `pnpm db:start` → `.env.local` → `pnpm db:reset && pnpm seed` → `pnpm dev`.

## 환경변수
`.env.example` 참조. `NEXT_PUBLIC_VIDEO_BASE_URL` = 화상 앱 주소(선택 — 비우면 같은 앱의 `/video`). 화상 진료는 `ANTHROPIC_API_KEY`(통역·소견 번역)가 추가로 필요하고, 중계 서버 `TURN_URLS`·`TURN_USERNAME`·`TURN_CREDENTIAL`, LAN 개발 허용 호스트 `ALLOWED_DEV_ORIGINS`는 선택.
