# 코드·git 규칙

## git
- 브랜치: 해커톤이므로 `main` 직접 커밋을 허용한다. 충돌을 피하려고 **폴더 단위로 소유**를 나눈다 (`apps/video` = 화상 팀원, 나머지 = 플랫폼).
- 커밋 전 `git pull --rebase`.
- 커밋 메시지: `feat(web): …`, `fix(video): …`, `docs: …` — 스코프는 폴더 이름.
- 비밀값 커밋 금지 (`.env*`는 `.env.example`만 추적).

## 코드
- TypeScript strict. 서버 컴포넌트 우선, 상호작용이 필요한 곳만 `"use client"`.
- DB 접근은 `lib/supabase/` 헬퍼만 쓴다.
- 환자 UI 문구는 일본어, 의원 콘솔은 한국어, 주석은 한국어(비직관적인 결정에만 한 줄).
- 스키마 변경은 `supabase/migrations/`에 새 SQL 파일로 추가한다 (기존 파일 수정 금지).

## 문서
- 구조·계약이 바뀌면 같은 커밋에서 `docs/`를 갱신한다.
