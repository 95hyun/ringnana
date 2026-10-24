// 데모 신원 — 로그인 대신 시드 고정 ID를 쓴다 (seed/index.ts가 같은 값으로 넣는다)
export const DEMO_CLINIC_ID = "00000000-0000-4000-8000-000000000001";
export const DEMO_DOCTOR_ID = "00000000-0000-4000-8000-000000000101";

// 데모 페르소나 (가상): 佐藤 美咲, 도쿄 29세, 기미 고민
export const DEMO_PATIENT_ID = "00000000-0000-4000-8000-000000001001";
// 페르소나 로그인 계정 (가상, 로컬 시드 전용)
export const DEMO_PATIENT_EMAIL = "misaki@ringnana.demo";
export const DEMO_PATIENT_PASSWORD = "ringnana";

// 데모 7번 장면용: 페르소나의 지난 방한 시술 → 귀국 후 체크인 (D+3 검토 완료, D+14 대기)
export const DEMO_AFTERCARE_BOOKING_ID = "00000000-0000-4000-8000-000000003001";

// 화상 앱 단독 테스트용: 진료 큐의 scheduled 진료(田中 優子)에 고정된 video_session_id
// video 앱이 /room/{DEMO_VIDEO_SESSION_ID}로 이 진료를 찾아 통화 중 사진을 저장한다
export const DEMO_VIDEO_SESSION_ID = "00000000-0000-4000-8000-000000005001";
