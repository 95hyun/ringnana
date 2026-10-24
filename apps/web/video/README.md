# apps/web/video — 1:1 화상 진료 (화상 담당 소유)

의사·환자 1:1 화상통화, 정면·좌·우 표준 사진 가이드 촬영, 양방향 실시간 AI 통역, 소견 일본어 번역 서버 기능을 제공한다. 플랫폼 앱 안 `/video` 아래에서 돌아 **배포가 하나**다. 기능 설명은 [docs/video.md](../../../docs/video.md), 플랫폼과의 약속은 [docs/video-integration.md](../../../docs/video-integration.md)에 있다.

## 실행

- **배포본:** 플랫폼 배포 주소 그대로 쓴다. 의원 콘솔 → 진료 상세 → [화상 진료 시작]이 같은 사이트의 `/video/room/...`을 연다. Vercel 프로젝트에 `ANTHROPIC_API_KEY`만 추가하면 된다(나머지 Supabase 키는 플랫폼과 공용).
- **로컬:**

```bash
cd apps/web
pnpm install
pnpm dev          # http://localhost:3000 — PC 한 대 시연은 이걸로 충분 (localhost 는 HTTP 여도 카메라 허용)
pnpm dev:https    # https://{IP}:3000 — 노트북 2대 시연 (개발용 인증서 자동 생성, 외부 접속 허용)
```

- 다른 노트북에서는 `https://{이 노트북 IP}:3000`으로 접속한다. 처음 접속하면 인증서 경고가 뜨니 "계속"을 눌러 허용한다(카메라·마이크는 HTTPS에서만 동작).
- Chrome 데스크톱만 지원한다. 노트북 2대일 때는 양쪽 모두 이어폰을 쓴다.

## PC 한 대로 시연하기
1. `pnpm dev` 후 이 PC의 Chrome에서 의사 주소와 환자 주소를 **각각 새 창**으로 열고 화면에 나란히 둔다. 탭으로 열면 가려진 쪽의 얼굴 분석이 멈춘다.
   - 예: `http://localhost:3000/video/room/00000000-0000-4000-8000-000000005001?role=doctor`와 `...?role=patient` (배포본이면 같은 경로를 배포 주소로)
2. 두 창이 서로를 알아보면 위쪽에 "시연 모드"/「デモモード」가 뜬다. 하나만 열어 시험할 때는 주소에 `&demo=1`을 붙인다.
3. 시연 모드에서는 상대 원음이 나오지 않고(되울림 방지), [말하기]/[話す]를 누른 창만 한 문장을 듣는다. 말 대신 예시 문장 버튼을 눌러도 같은 통역이 나온다.
4. 중계 서버는 필요 없지만 인터넷(Supabase·번역 API·Chrome 음성 인식)은 필요하다.

## 환경변수 (`apps/web/.env.local`, 커밋 금지 · 배포본은 Vercel 프로젝트 설정)

| 키 | 내용 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | 플랫폼과 공용 (이미 있음) |
| `ANTHROPIC_API_KEY` | 통역·소견 번역 (서버 전용) |
| `ALLOWED_DEV_ORIGINS` | 다른 노트북에서 LAN IP로 접속할 때 허용할 호스트 (쉼표 구분, 예: `192.168.0.10`) |
| `ALLOWED_PLATFORM_ORIGINS` | (화상을 다른 주소에서 따로 띄울 때만) 소견 번역을 부를 의원 콘솔 출처 |
| `TURN_URLS`, `TURN_USERNAME`, `TURN_CREDENTIAL` | (선택) 중계 서버. 세 값이 모두 있을 때만 쓰고, 없으면 공개 STUN만 쓴다 |

### 중계 서버(선택) 준비
행사장 와이파이가 기기 간 직접 연결을 막을 때만 쓰인다. Metered 무료 TURN(Open Relay)에 가입해 대시보드에서 받은 주소·사용자명·비밀번호를 위 세 키에 넣는다. 무료 한도는 가입할 때 확인한다.

## 플랫폼 쪽 선행 조건
- H1이 `photos.consented_at`과 `consultations.notes_ja`·`notes_ja_source`·`notes_translation_status` 칸을 추가해야 사진 제출과 소견 번역 저장이 된다([docs/requests.md](../../../docs/requests.md)).
- 단독 시험용 진료: `video_session_id = 00000000-0000-4000-8000-000000005001` (플랫폼 시드).

## 주소

| 주소 | 용도 |
|---|---|
| `/video/room/{sessionId}?role=doctor\|patient&name=&lang=ja\|ko&returnUrl=` | 방 (플랫폼이 만들어 보냄) |
| `/video/room/{sessionId}?role=patient&test=1` | 통화 없이 촬영만 시험 |
| `/video/room/{sessionId}?role=...&demo=1` | 한 대 시연 모드 강제 (같은 브라우저에 상대 창이 있으면 자동) |
| `/video/check?lang=ja\|ko&returnUrl=` | 입장 전 카메라·마이크 점검 |
| `POST /api/capture`, `GET /api/capture/latest` | 사진 제출·최신 회차 |
| `POST /api/translate` | 통역 문장 번역 |
| `POST /api/opinion/translate` | 소견 일본어 번역 (의원 콘솔 브라우저가 호출, CORS) |
| `GET /api/ice` | 연결 설정 (STUN + 선택 TURN) |

## 검사

```bash
cd apps/web && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

동작 확인은 [docs/demo-checklist.md](docs/demo-checklist.md)로 노트북 2대에서 사람이 한다.

## 현장 조정
- 각도·시간·밝기 등 기준값: `video/lib/config.ts`
- 좌우·상하가 반대로 판정되면: `video/lib/face/math.ts`의 `YAW_SIGN` / `PITCH_SIGN`을 `-1`로
- 의료 용어 대역표: `video/lib/translate/glossary.ts`
- 시연 예시 문장: `video/lib/config.ts`의 `demo.phrases`
