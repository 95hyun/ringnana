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
| **H1 기반** | Next.js 스캐폴딩, Tailwind·shadcn, Supabase 클라이언트, 스키마·시드, 공통 레이아웃 | `package.json`, 설정 파일, `lib/supabase/`, `components/ui/`, `app/layout.tsx`, `seed/`, 레포 루트 `supabase/` |
| **H2 환자 접수** | 랜딩, 문진·금기 스크리닝, 사진 촬영 가이드·업로드 | `app/(patient)/page.tsx`, `app/(patient)/intake/`, `app/(patient)/photos/`, `lib/intake.ts` |
| **H3 의원 콘솔·화상 연결** | 진료 큐, 문진·사진 열람, 화상 입장 연결, 소견·견적 작성 | `app/clinic/` (aftercare 제외), `app/(patient)/consult/`, `lib/video.ts`, `app/api/video/` |
| **H4 견적·예약·사후관리** | 환자 견적 확인·예약, 귀국 후 체크인, 의원 측 체크인 검토 | `app/(patient)/quote/`, `app/(patient)/aftercare/`, `app/clinic/aftercare/` |

- **H1이 먼저 끝나야 한다.** H1이 스캐폴딩·스키마를 push하기 전에는 H2~H4는 화면 설계·컴포넌트 초안만 하고, `git pull`로 H1 결과가 들어온 뒤 본 작업에 들어간다.
- 레인별 공용 컴포넌트는 자기 폴더 안 `_components/`에 둔다.
- **소유하지 않은 파일은 수정하지 않는다.** 필요하면 작업을 멈추지 말고 `docs/requests.md`에 `- [H2→H1] 무엇이 왜 필요한지` 한 줄을 남기고, 임시로 자기 폴더 안에서 우회한다.
- `apps/video/`는 사람 팀원 소유 — 어떤 head도 수정하지 않는다.
- 스키마 변경은 H1만 한다. 다른 레인은 `docs/requests.md`로 요청한다.

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
