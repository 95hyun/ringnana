# Ringnana — Claude 작업 가이드

일본인 방한객용 K-피부과 비대면 진료 플랫폼. **해커톤 프로젝트** — 데모 한 장면이 기능 수보다 중요하다. 엔터프라이즈급 인프라(마이크로서비스·큐·멀티리전 등)는 만들지 않는다.

## 먼저 읽을 것
- 무엇을 만드나: `docs/product/plan.md` (기획안), 근거는 `docs/product/research.md`
- 어떻게 만드나: `docs/architecture.md` (스택·폴더·데이터 모델)
- 데모 범위·우선순위: `docs/scope.md`, 데모 동선: `docs/demo-scenario.md`
- 화상통화 연동 계약: `docs/video-integration.md`
- 코드·git 규칙: `docs/conventions.md`
- 병렬 세션 레인 분담: `docs/HEAD.md` (레인을 받았으면 소유 경로만 수정)

## 경계 (중요)
- 화상 진료 코드(`apps/web/video/`, `apps/web/app/video/`, `apps/web/app/api/`, `apps/web/public/mediapipe/`) = **화상통화 담당 팀원 소유**. 플랫폼 앱 안에 있지만 플랫폼 작업에서 이 경로들을 수정하지 않는다. 연동은 `docs/video-integration.md`의 계약으로만 한다.
- 플랫폼 = `apps/web/` + `supabase/`.
- 계약(`docs/video-integration.md`)을 바꿔야 하면 코드보다 문서를 먼저 고치고 팀원에게 알린다.

## 규칙
- 사용자 UI 문구는 일본어, 문서·주석은 한국어.
- 의료 판단을 코드가 하지 않는다 — 진단·견적은 의사 입력. 자동 로직은 문진 금기 플래그·사진 품질 체크까지만.
- 실제 환자 데이터 금지. 시드 데이터는 가상 인물.
- 비밀값은 `.env.local`(커밋 금지), 키 이름만 `.env.example`에 둔다.
- 문서와 코드가 어긋나면 문서를 갱신한다 — 이 docs가 다음 세션의 기억이다.
