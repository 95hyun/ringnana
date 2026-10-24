# 레인 간 요청

> 형식: `- [요청레인→소유레인] 무엇이 왜 필요한지` · 처리하면 `~~취소선~~ → 처리 커밋`

- [video→H1] `photos`에 `consultation_id`(nullable), `source`(`intake`/`call`, 기본 `intake`), `capture_batch_id`, `capture_mode`(`auto`/`manual`), `yaw`·`pitch` 컬럼 추가 + 비공개 사진 버킷 이름 공유 — 통화 중 추가 촬영 사진을 플랫폼에 저장하기 위해 (video-integration.md §4)
- [video→H1] 시드에 `video_session_id`(UUID)가 있는 데모 진료 1건 — video 앱이 sessionId로 진료를 찾아 사진을 저장하기 위해
- [video→H3] 의원 콘솔 사진 열람에서 `source = call` 사진을 회차별(최신 먼저)로 표시 — 통화 후 소견·견적 작성 때 보기 위해
- [video→팀] `scope.md`·`demo-scenario.md`에 장면 4(화상 진료) 안의 "통화 중 추가 촬영" 반영 여부 확인 — 사전 `/photos` 동선은 그대로 둠 (face-capture.md)
