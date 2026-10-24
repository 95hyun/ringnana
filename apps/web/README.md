# apps/web — 플랫폼 (환자 앱 + 의원 콘솔)

Next.js 16(App Router) + Supabase(로컬 Docker). 구조·데이터 접근 규칙은 [docs/architecture.md](../../docs/architecture.md).

## 로컬 실행
```bash
cd apps/web
pnpm install
pnpm db:start                 # 로컬 Supabase (Docker 필요, 처음엔 이미지 다운로드)
cp ../../.env.example .env.local   # 값은 아래 참고
pnpm db:reset && pnpm seed    # 마이그레이션 적용 + 가상 데이터
pnpm dev                      # http://localhost:3000/dev 에서 DB 연결 확인
```

`.env.local` 값: `pnpm exec supabase status --workdir ../..`의 `API_URL` → `NEXT_PUBLIC_SUPABASE_URL`, `ANON_KEY` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SERVICE_ROLE_KEY` → `SUPABASE_SERVICE_ROLE_KEY`. 로컬 기본 키는 모든 머신에서 같다.

## 스크립트
| 명령 | 내용 |
|---|---|
| `pnpm db:start` / `db:stop` | 로컬 Supabase 시작·정지 (루트 `supabase/`) |
| `pnpm db:reset` | DB를 지우고 `supabase/migrations/` 재적용 — **모든 데이터 삭제** |
| `pnpm seed` | 행·사진을 지우고 가상 데이터로 다시 채움 (멱등) — **다른 레인 데이터도 삭제**. 로컬 URL이 아니면 거부(`SEED_ALLOW_REMOTE=1`로 해제) |
| `pnpm db:types` | 스키마 → `lib/supabase/database.types.ts` |
| `pnpm build` / `lint` | 완료 판정 명령 |

> 같은 머신의 head 세션들은 로컬 DB 하나를 공유한다. `db:reset`·`seed`는 H1 작업과 데모 직전에만 돌린다.
> Studio: http://127.0.0.1:54323
