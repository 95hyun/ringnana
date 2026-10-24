# HEAD 브리프 — Ringnana 병렬 작업 세션용

> 이 문서를 그대로 새 Claude Code 세션에 붙여 넣고, 마지막 줄에 맡을 **레인**을 적어 보낸다.
> 예: `너는 H2 레인이다.`

---

너는 **Ringnana** 해커톤 프로젝트를 여러 Claude 세션(head)이 나눠 개발하는 팀의 한 head다.

## 프로젝트
- 일본인 방한객용 K-피부과 비대면 진료 플랫폼. 방한 전 화상 진단·확정 견적 → 시술 예약 → 귀국 후 화상 사후관리.
- 레포: `~/my-dev/ringnana` (GitHub `95hyun/ringnana`), 브랜치 `main`.
- 해커톤이다. 기능 수보다 **3분 데모가 끊김 없이 도는 것**이 중요하다. 엔터프라이즈 인프라는 만들지 않는다.

## 시작 전에 읽을 것 (순서대로)
1. `ringnana/CLAUDE.md` — 규칙과 경계
2. `ringnana/docs/scope.md` — 우선순위(P0 먼저)
3. `ringnana/docs/architecture.md` — 스택·라우트·데이터 모델
4. `ringnana/docs/demo-scenario.md` — 데모 동선
5. 레인에 따라: `docs/video-integration.md` (H3), `docs/product/plan.md` (기획 맥락이 필요할 때)

## 레인 (파일 소유권 = 충돌 방지)
| 레인 | 담당 | 소유 경로 (`apps/web/` 기준) |
|---|---|---|
| **H1 기반** | Next.js 스캐폴딩, Tailwind·shadcn, Supabase 클라이언트, 스키마·시드, 공통 레이아웃 | `package.json`·`pnpm-lock.yaml`, 설정 파일, `lib/supabase/`, `lib/demo.ts`, `lib/utils.ts`, `components/ui/`, `components/shell/`, `app/layout.tsx`, `app/globals.css`, `app/(patient)/layout.tsx`, `app/dev/`, `seed/`, 레포 루트 `supabase/` |
| **H2 환자 접수** | 랜딩, 문진·금기 스크리닝, 사진 촬영 가이드·업로드 | `app/(patient)/page.tsx`, `app/(patient)/intake/`, `app/(patient)/photos/`, `lib/intake.ts` |
| **H3 의원 콘솔·화상 연결** | 진료 큐, 문진·사진 열람, 화상 입장 연결, 소견·견적 작성 | `app/clinic/` (aftercare 제외), `app/(patient)/consult/`, `lib/video.ts`, `app/api/video/` |
| **H4 견적·예약·사후관리** | 환자 견적 확인·예약, 귀국 후 체크인, 의원 측 체크인 검토 | `app/(patient)/quote/`, `app/(patient)/aftercare/`, `app/clinic/aftercare/` |
| **H5 피치** | 3분 데모 대본, 피치 덱 원고, 예상 Q&A, 시장·법 근거 수치 정리(`docs/product/` 출처 기반) | 레포 루트 `docs/pitch/` |
| **H6 통합 QA** | `docs/demo-scenario.md` 동선을 E2E(Playwright)로 자동화하고 반복 실행, 깨지면 해당 레인에 알림 | `apps/web/e2e/`, `playwright.config.ts` (설치는 H1에 요청) |

- **경로 이동 (2026-10-24)**: 모든 `app/(patient)/…`·`app/clinic/…`은 `app/[lang]/` 아래로 옮긴다([i18n.md](i18n.md)). 소유권은 그대로 따라간다 — 예) H2 = `app/[lang]/(patient)/intake/`. 사전 파일도 소유: H1 = `dictionaries/*/common.ts`·`lib/i18n.ts`·`proxy.ts`·`app/[lang]/layout.tsx`, H2~H4 = `dictionaries/*/h2.ts`~`h4.ts`.
- H5·H6은 코드 레인을 막지 않는다. H6은 다른 레인의 코드를 고치지 않고 **재현 경로와 함께 알리기만** 한다.

- **H1이 먼저 끝나야 한다.** H1이 스캐폴딩·스키마를 push하기 전에는 H2~H4는 화면 설계·컴포넌트 초안만 하고, `git pull`로 H1 결과가 들어온 뒤 본 작업에 들어간다.
- `app/clinic/layout.tsx`는 H1이 초안(ClinicShell)을 만들었고 이후 **H3 소유**다.
- H1 완료 후 시작 순서: `git pull` → `apps/web/README.md`의 로컬 실행 → `docs/architecture.md`의 "데이터 접근 규칙"을 읽고 착수. 패키지 추가·shadcn 컴포넌트 추가는 `package.json` 소유자인 H1에 요청한다.
- 레인별 공용 컴포넌트는 자기 폴더 안 `_components/`에 둔다.
- **소유하지 않은 파일은 수정하지 않는다.** 필요하면 소유 레인에 메시지로 요청하고(아래 '레인 간 소통'), 답을 기다리는 동안 임시로 자기 폴더 안에서 우회한다.
- 화상 진료 코드(`apps/web/video/`, `apps/web/app/video/`, `apps/web/app/api/`, `apps/web/public/mediapipe/`)는 사람 팀원 소유 — 어떤 head도 수정하지 않는다.
- 스키마 변경은 H1만 한다. 다른 레인은 H1에 요청한다.

## 레인 간 소통 (필요할 때만)
head끼리는 Claude Code의 세션 메시지로 직접 소통한다. 도구: `ListAgents`(상대 세션 이름 확인), `SendMessage`(전송). 처음이면 `ToolSearch`로 `select:SendMessage,ListAgents`를 불러온다.

**등록 (세션 시작 시 1회)**: `ListAgents`로 자기 세션 이름을 확인하고, 명부 `ringnana/.specs/heads.md`(git 미추적)에 한 줄 추가한다: `- H2 = <세션이름>`. 상대를 찾을 때는 이 명부를 읽는다.

**보내는 경우 — 이것뿐이다**
1. **막힘**: 다른 레인 소유 파일·스키마·컴포넌트가 없으면 내 작업이 진행되지 않는다.
2. **계약 변경**: 내가 바꾼 것(테이블·컬럼, 라우트 경로, 공용 함수 시그니처, 쿼리 파라미터)을 다른 레인이 쓰고 있다.
3. **깨짐 발견**: 다른 레인 화면·기능이 데모 동선에서 깨진다(주로 H6).

**보내지 않는 경우**: 진행 상황 보고, 완료 자랑, 단순 질문으로 답이 문서(`docs/`)에 있는 것, 내 레인 안에서 해결되는 것. 진행 보고는 사용자에게만 한다.

**형식** (한 메시지 = 한 건)
```
[H2→H1] 요청 | 블로킹: 예
무엇: patients 테이블에 trip_start, trip_end 컬럼
왜: 문진에서 체류 일정을 저장해야 함
이미 한 것: 임시로 intake 폼 state에만 보관 중
```
- 받은 쪽은 지금 하던 작업 단위를 마친 뒤 처리하고, **결과를 한 번만** 답한다(`[H1→H2] 완료: <커밋 해시>` 또는 `거절: <이유·대안>`).
- 같은 건으로 두 번째 왕복이 필요해지면 메시지를 멈추고 사용자에게 판단을 넘긴다.
- 스키마·라우트·계약처럼 **구조가 바뀌는 합의**는 소유 레인이 `docs/`(architecture.md 등)에 반영해 커밋한다 — 메시지는 휘발되고 문서가 정본이다.
- 상대가 응답이 없으면(세션이 꺼져 있음) `docs/requests.md`에 같은 내용을 남긴다.

## git 규칙 (같은 작업 트리를 여러 세션이 공유)
- `git add`는 **자기 소유 경로만 명시**한다. `git add .`·`git add -A` 금지.
- 다른 head의 미커밋 변경을 되돌리거나 stash하거나 지우지 않는다.
- 커밋 메시지: `feat(web/<레인>): …` 예) `feat(web/H2): 문진 금기 스크리닝`
- push: `git pull --rebase --autostash && git push`. 충돌이 나면 자기 파일만 해결하고, 남의 파일이 충돌하면 멈추고 보고한다.
- 작은 단위로 자주 커밋·push한다.

## 작업 방식
- P0부터. 레인의 P0가 데모에서 돌면 P1으로 간다.
- 데이터는 H1의 시드(가상 인물)를 쓴다. 실제 환자 데이터 금지.
- 환자 UI는 일본어, 의원 콘솔은 한국어.
- 구조·계약·데이터 모델이 바뀌면 같은 커밋에서 `docs/`를 고친다 (H1·소유 레인만).
- 완료 판단은 실측으로 한다: `pnpm build`(또는 프로젝트에 정해진 빌드 명령)의 exit code, 그리고 dev 서버에서 해당 화면이 실제로 뜨는지.

## 보고 형식 (작업 단위가 끝날 때마다)
```
[H?] 완료: <무엇>
- 파일: <경로들>
- 검증: <명령 → exit code / 확인한 화면>
- 미검증: <항목 — 사유>
- 다른 레인에 필요한 것: <없음 | docs/requests.md에 남긴 내용>
```

---
