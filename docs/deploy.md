# 배포 (시연용)

> 2026-10-24 구성. 비밀값은 여기에 쓰지 않는다 — Vercel 환경변수와 로컬 `apps/web/.env.production.local`(gitignore)에만 있다.

## 구성
| 항목 | 값 |
|---|---|
| 앱 | Vercel 프로젝트 `ringnana` (개인 팀 `95hyuns-projects`), Root Directory `apps/web`, 함수 지역 `icn1`(서울) |
| 공개 주소 | https://ringnana-zeta.vercel.app (Production 도메인) |
| 배포 트리거 | GitHub `95hyun/ringnana` 연동. **`main` push·병합 = Production**, 그 밖의 브랜치(`my` 등) push = Preview(Vercel 로그인 보호) |
| 빌드 생략 | `apps/web`·`supabase` 변경이 없는 커밋은 빌드 안 함 (Ignored Build Step) |
| DB | Supabase Cloud 프로젝트 `ringnana`(서울 `ap-northeast-2`, 개인 조직 95hyun) — 화상 앱도 같은 프로젝트 사용 |
| 환경변수 | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`(config), `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, `BBANANA_API_KEY`(secret), `NEXT_PUBLIC_VIDEO_BASE_URL`(화상 앱 주소 — 미정, 비어 있으면 입장 버튼 비활성) |

## 계정 분리 (중요)
- Vercel CLI는 **반드시** `--global-config ~/.config/vercel-95hyun --scope 95hyuns-projects`로 실행한다. 이 Mac의 기본 Vercel 로그인은 회사 계정이다.
- Supabase CLI는 개인 조직(95hyun)으로 로그인돼 있다.

## 스키마 변경 반영
```bash
cd apps/web
set -a; . ./.env.production.local; set +a
npx supabase db push --workdir ../.. -p "$SUPABASE_DB_PASSWORD"
npx supabase migration list --linked --workdir ../.. -p "$SUPABASE_DB_PASSWORD"   # Local = Remote 확인
```
코드보다 스키마를 먼저 올린다(마이그레이션은 추가만 하는 형태라 이전 코드와 호환).

## 데이터 초기화 (시연 직전)
```bash
cd apps/web && SEED_ALLOW_REMOTE=1 npx tsx --env-file=.env.production.local seed/index.ts
```
- **전부 지우고 다시 채운다** — 화상 앱 테스트 데이터·가입 계정 포함. 실행 전 팀원에게 알린다.
- 날짜는 실행일 기준이라 시연 당일에 돌린다(사후관리 장면이 D+14가 된다).

## 시연 운영
1. 시연 30분 전: 모든 세션 `main` 병합·push 중단(동결).
2. 공개 주소에서 데모 동선([demo-scenario.md](demo-scenario.md)) 1회 리허설.
3. 문제가 생기면 Vercel 대시보드 → Deployments → 직전 정상 배포 → **Instant Rollback**.

## 화상 앱
- 같은 레포에서 별도 Vercel 프로젝트로 배포 예정(팀원). 주소가 정해지면 `NEXT_PUBLIC_VIDEO_BASE_URL`을 Production·Preview에 넣고 **재배포**(빌드 시 고정되는 값).
