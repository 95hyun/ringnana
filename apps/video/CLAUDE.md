# apps/video — Ringnana 1:1 화상 진료 앱

일본인 방한객용 K-피부과 비대면 진료 플랫폼 Ringnana의 화상 진료 앱이다. 해커톤 시연(노트북 2대, PC Chrome)용이며, 의사·환자 1:1 통화 위에 정면·좌·우 표준 사진 가이드 촬영, 양방향 실시간 AI 통역(의사 한국어 ↔ 환자 일본어), 소견 일본어 번역 서버 기능을 얹는다. 화상 담당 소유의 독립 Next.js 16 앱(3001, HTTPS 개발 서버)이고, 플랫폼 앱(`apps/web`, 다른 팀원 소유)과는 같은 Supabase와 입장 주소·`returnUrl`로만 이어진다. 엔터프라이즈 인프라(미디어 서버·큐·로그인 체계)는 넣지 않는다.

## 구조

```
apps/video/
├── AGENTS.md / CLAUDE.md
├── README.md                    → 실행·환경변수·중계 서버 준비·현장 조정
├── docs/demo-checklist.md       → 노트북 2대 사람 점검표 (동작의 최종 근거)
├── app/
│   ├── room/[sessionId]/        → 방 화면 진입 (쿼리 검사 후 클라이언트 방으로)
│   ├── check/                   → 입장 전 카메라·마이크 점검 화면
│   └── api/
│       ├── capture/             → 회차 3장 일괄 제출, latest = 최신 제출 회차 조회
│       ├── translate/           → 통역 문장 번역 (haiku, 3초)
│       ├── opinion/translate/   → 소견 일본어 번역 (sonnet, CORS — 의원 콘솔 브라우저가 호출)
│       └── ice/                 → STUN + 선택 TURN 목록
├── components/
│   ├── room/                    → 방 전체: 채널·Presence·WebRTC·장치·배치·통화 종료
│   ├── capture/                 → CaptureSlot: 의사 촬영 패널 / 환자 동의·가이드 촬영·미리보기·제출
│   ├── interp/                  → InterpSlot: 자막 두 자리 + 통역 컨트롤 (세 인스턴스가 한 상태 공유)
│   └── check/                   → 점검 화면
├── lib/
│   ├── contracts.ts             → 서버 API·실시간 이벤트·RoomContext 타입 (모든 부분의 공통 약속)
│   ├── config.ts                → 현장 조정값 전부 (각도·시간·밝기·모델·볼륨·시연 예시 문장)
│   ├── capture/                 → 촬영 판단 순수 로직 (막는 조건·유지 타이머·수동 촬영)
│   ├── capture-flow/            → 의사·환자 촬영 상태 전이 리듀서
│   ├── face/                    → MediaPipe 얼굴 분석 → FrameAnalysis (부호 상수 YAW_SIGN/PITCH_SIGN)
│   ├── capture-store/           → 사진 제출·조회 처리기 + Supabase/메모리 저장소
│   ├── opinion/                 → 소견 번역 처리기 + Supabase/메모리 저장소
│   ├── translate/               → Claude 번역기·가짜 번역기·지시문·의료 용어 대역표
│   ├── interp/                  → 자막 목록·읽기 대기열·음성 인식 보조·통역 상태 저장소·문장 번역 방송·시연 듣기 잠금
│   ├── room/                    → 쿼리·Presence 판단·언어 기억·ICE·장치 오류 분류·시연 모드 판정(같은 브라우저 창 감지)
│   └── supabase/                → 서버 전용 클라이언트·브라우저 클라이언트·최소 행 타입
├── messages/{ja,ko}/            → 환자 화면 문구 (common·call·capture·interp·check, 키 동일)
└── public/mediapipe/            → MediaPipe wasm·얼굴 모델 (CDN 대신 앱이 직접 제공)
```

## 반드시 지킬 것
- **수정 범위는 `apps/video/`와 레포 `docs/`의 화상 문서 세 개(`video.md`, `video-integration.md`, `requests.md`)뿐이다.** `apps/web/`, `supabase/`(스키마)와 그 밖의 `docs/`는 플랫폼 소유라 손대지 않는다. 스키마가 필요하면 레포 `docs/requests.md`에 플랫폼 H1 요청을 쓰고, 플랫폼과의 약속이 바뀌면 코드보다 `docs/video-integration.md`를 먼저 고친 뒤 사용자에게 알린다.
- **저장 사진은 좌우 반전하지 않은 원본이고, `left`/`right`는 환자 본인 기준이다.** yaw 양수 = 환자가 자기 왼쪽으로 돌림. 화면 미리보기만 거울 반전한다.
- **제출된 촬영 회차는 항상 front·left·right 3장이고, 바뀌지 않으며, 같은 회차로 두 번 저장되지 않는다.** 3장이 안 된 회차는 저장하지 않는다.
- **환자에게 보이는 소견 번역은 항상 현재 원문의 번역이다.** 번역 결과는 원문이 그대로일 때만 저장하고, 번역한 원문(`notes_ja_source`)을 함께 남긴다.
- **서버 전용 키(`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`)는 `server-only` 모듈과 라우트에서만 쓴다.** `NEXT_PUBLIC_` 값이나 클라이언트 컴포넌트에 넣지 않는다.

## 작업 전에 읽을 것
- 공통 타입과 조정값: `lib/contracts.ts`, `lib/config.ts`. 이벤트·API 형식을 바꾸면 방·촬영·통역이 함께 깨지므로, 바꿔야 하면 사용자에게 먼저 알린다.
- 촬영 판정이 이상할 때: 아래 "구현 메모"의 부호 확인 절차를 먼저 본다. 기준값은 `lib/config.ts`에서만 고친다.
- 방 연결·Presence를 고칠 때: `lib/room/presence.ts`(가장 늦게 들어온 창 우선, 신호 수락 규칙)와 `components/room/useRoomChannel.ts`의 채널 재사용 처리를 먼저 읽는다.
- Claude 호출을 고칠 때: 설치된 `@anthropic-ai/sdk`의 현재 타입을 확인한다. 기억으로 요청 모양을 추측하지 않는다. Next.js도 16이라 `node_modules/next/dist/docs/`를 먼저 본다.
- 환자 문구를 추가할 때: `messages/ja`와 `messages/ko`에 같은 키로 넣는다(자동 검사가 키 집합을 비교한다).

## 문제가 생기면
- **바로 사용자에게 알릴 것:**
  - 저장된 좌우 사진이 뒤바뀜
  - 같은 회차가 두 번 저장되거나 3장 미만으로 저장됨
  - 환자 화면에 고치기 전 소견 번역이 보임
  - 서버 전용 키가 브라우저 번들에 들어감
  - 다른 진료의 사진·소견이 섞임
- 그 밖의 문제는 레포 `docs/requests.md`(플랫폼에 필요한 것)나 사용자 보고로 남긴다.

## 이 앱의 범위와 경계
- **이 앱의 범위:**
  - 방 화면, 통화 연결
  - 촬영(동의 → 가이드 촬영 → 미리보기·장별 재촬영 → 3장 일괄 제출)
  - 통역
  - 소견 번역 서버 기능
  - 점검 화면
- **이 앱의 범위가 아닌 것:**
  - 소견·견적 작성 화면, 환자 견적 화면의 번역 표시, 의원 콘솔의 번역 호출 버튼 → 플랫폼
  - 진료 상태 변경(`in_call`/`done`) → 플랫폼. 의사가 `returnUrl`로 돌아가는 것이 종료 신호다
  - 로그인·권한. 방 키는 추측 불가 UUID(`consultations.video_session_id`)다
  - 녹화·3자 통화·자체 미디어 서버
- **DB 접근:**
  - 테이블 읽기·쓰기는 서버 경로에서 서버 전용 키로만 한다. 브라우저는 Realtime 채널에만 공개 키를 쓴다.
  - 쓰는 테이블:
    - `photos`: `source = 'call'` 행만
    - `consultations`: 읽기와 번역 칸 3개(`notes_ja`, `notes_ja_source`, `notes_translation_status`)만
  - `photos.consented_at`과 번역 칸 3개는 플랫폼 H1이 추가해야 생긴다. 없으면 제출·번역 저장이 500이 된다.

## 불변 조건과 규칙 (검사 가능한 형태)
- **연결:**
  - 연결 제안은 의사만 하고, 의사 화면에 내 영상이 준비되고 유효한 환자 창이 있을 때만 한다.
  - 같은 역할의 창이 여럿이면 Presence `joinedAt`이 가장 늦은 창만 유효하다. 밀려난 창은 미디어·연결·채널을 닫고 안내만 띄운다.
  - 상대 신호의 `tabId`가 Presence에 아직 없으면 버리지 않고 보류했다가 Presence가 갱신되면 다시 판단한다. Presence에 있지만 밀려난 창의 신호만 버린다(새 의사 창의 offer가 Presence보다 먼저 도착해도 연결되게).
  - 의사는 offer 뒤 5초 안에 answer가 없으면 상대 창 하나당 한 번 다시 제안한다.
- **촬영 이벤트:**
  - 촬영 이벤트(`capture:*`)는 현재 회차와 다른 `batchId`면 무시한다.
  - 예외: 의사 화면에 진행 중인 요청이 없을 때 온 이벤트는 그 회차로 바꾼다(`?test=1` 단독 촬영 대응).
- **촬영 판단:**
  - 막는 조건 우선순위: 얼굴 없음 → 2명 이상 → 너무 작음/큼 → 가운데 벗어남 → 각도 부족 → 각도 초과. 안내는 첫 번째 하나만 보인다.
  - 어두움은 안내만 하고 막지 않는다(행사장이 어두우면 시연이 멈추므로).
  - 막는 조건을 모두 통과한 상태가 1초 끊기지 않으면 촬영하고, 하나라도 벗어나면 타이머를 0으로 되돌린다.
  - 15초 안에 자동 촬영이 안 되면 수동 촬영 버튼을 띄운다. 수동 촬영은 조건과 상관없이 찍고, 얼굴이 없으면 yaw·pitch를 null로 둔다.
- **제출:**
  - `POST /api/capture`는 그 진료에 그 `batchId` 행이 이미 3개면 아무것도 쓰지 않고 `already_saved`를 돌려준다.
  - 그렇지 않으면 버킷에 덮어쓰기로 올린 뒤 3행을 한 번의 upsert(`capture_batch_id,angle`, 중복 무시)로 넣는다.
- **통화 종료:**
  - 의사 종료는 `call:end`를 보내고(최대 1.5초 대기) 의사 `returnUrl`로 이동한다.
  - 환자는 `call:end`를 받으면, 또는 자기 종료 버튼을 누르면, 등록된 종료 대기(제출 중)가 끝난 뒤 이동한다.
  - `returnUrl`이 http(s) 절대 주소가 아니면 이동하지 않고 종료 안내를 띄운다.
- **통역:**
  - 통역 언어는 역할로 고정한다(의사 ko-KR, 환자 ja-JP). 환자 화면 언어 전환은 문구만 바꾼다.
  - 번역 음성을 읽는 중과 읽기 직후 약 0.6초 동안 들어온 내 인식 결과는 버린다(스피커 소리 되돌림 방지).
  - 번역에 실패한 문장은 원문 + 실패 표시로 보이고 읽지 않는다.
- **소견 번역:**
  - 허용 출처(`ALLOWED_PLATFORM_ORIGINS`, 정확히 일치)에만 CORS를 열고, 그 출처라면 오류 응답에도 헤더를 붙인다.
  - 번역 중 원문이 바뀌면 `stale`을 돌려주고, 아무것도 쓰지 않으며, 상태는 `pending`으로 남는다.
- **환자 화면 언어:** 진료방(`sessionId`)마다 따로 기억하고, 새 방은 `lang`으로 시작한다.

## 구현 메모 (코드만으로 알기 어려운 것)
- **부호:** 얼굴 방향 부호(`lib/face/math.ts`의 `YAW_SIGN`/`PITCH_SIGN`)는 MediaPipe 변환 행렬을 열 우선으로 보고 유도한 값이라 아직 실제 웹캠으로 확인되지 않았다. 환자가 자기 왼쪽으로 돌렸는데 우측 단계가 진행되면 `YAW_SIGN`을 −1로 바꾼다. 값 자체가 엉뚱하면 행렬을 행 우선으로 읽도록(`data[2], data[6], data[10]`) 고친다.
- **Realtime 채널 재사용:** supabase-js는 같은 이름의 채널을 재사용한다. 그래서 방 채널을 만들기 전에 닫히는 중인 같은 이름 채널을 정리하고, 개발 모드 effect 두 번 실행에 대비해 생성을 한 박자 늦춘다. 이 처리를 지우면 개발 모드에서 신호가 두 번 오거나 끊긴다.
- **원음 요소:** 상대 원음은 항상 마운트된 `<audio>` 하나로만 나온다. 영상 요소는 모두 muted다. 통역 읽기 중 볼륨 조절이 배치 전환에 흔들리지 않게 하기 위해서다.
  - 볼륨은 통역 쪽만 바꾼다. 방 쪽에서 볼륨을 만지면 서로 덮어쓴다.
- **자동 검사와 `server-only`:**
  - 자동 검사에서 `server-only` 모듈(`lib/translate`, `lib/translate/claude`, Supabase 저장소)을 불러올 때는 `vi.mock("server-only", () => ({}))`가 먼저 필요하다.
  - 처리기는 모두 저장소·번역기를 주입받으므로, 검사는 메모리 저장소와 `createFakeTranslator`로 한다.
- **시간 제한:** 소견 번역의 시간 제한은 처리기의 경쟁(30초)과 SDK 요청 시간 제한 두 겹이다. 통역은 서버 3초, 클라이언트 6초다.

## 검사
- 명령: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`(모두 `apps/video`에서). 모두 성공해야 한다.
- 꼭 자동 검사로 지킬 것:
  - 촬영 판단 경계값(정면 ±5°, 측면 35°·55°, pitch ±15°)과 좌우 부호
  - 촬영 상태 전이(회차 불일치 무시, 취소·재요청 시 버림, 한 방향 재촬영, 제출 실패 시 사진 유지)
  - 제출 검사(방향 누락·중복 400, `already_saved`)
  - 소견 번역(`done`·`failed`·`stale`, 409, CORS)
  - 통역 자막 목록(3개, id 중복 무시)과 읽기 대기열
  - 같은 역할 여러 창, 방별 언어 기억
  - ja/ko 문구 키 일치
- 실제 통화·웹캠·음성은 자동 검사로 확인할 수 없다. `docs/demo-checklist.md` 사람 점검이 최종 근거다.

## 남은 일
- 플랫폼:
  - H1: `photos.consented_at`, `consultations` 번역 칸 3개
  - H3: 콘솔의 소견 번역 호출·상태·[다시 번역]
  - H4: 견적 화면 번역 표시, 경과 비교 기준을 통화 정면 사진으로
  - H1: 문서의 "덮어씀" 정정
- 웹캠으로 좌우·상하 부호 확인, 실제 Claude API·Supabase 연동 확인, 일본어 문구·의료 용어 대역표 검수.
- 이후 범위: 3자 통화·녹화가 필요해지면 미디어 서버 도입, 로그인·권한, 서버 측 사진 재검사·EXIF 제거, 모바일, 통역 기록 저장, 경과 비교 화면.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
