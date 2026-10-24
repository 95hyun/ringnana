# 유저 플로우 (flow-v2, 2026-10-24 사용자 확정)

> 정본. 화면을 추가·이동할 때 이 표를 먼저 고친다. 계획서: `.specs/flow-v2/spec.md`(로컬). 화면 시안: Figma S1~S6.

## 환자 (`/[lang]/…`, lang = jp | ko)
| # | 단계 | 경로 | 상태(consultations.status) | 시안 |
|---|---|---|---|---|
| 1 | 가입·로그인 | `/login` | — | — |
| 2 | 의사 탐색 — 고민·시술 분야 / 상담 가능 날짜 / 통역·진료 언어 / 의원 지역. 정렬 = 가장 빠른 상담 시간. 후기·랭킹·가격 비교 없음 | `/doctors` | — | 없음 |
| 3 | 의사 프로필 — 소개·분야·언어·의원·빈 상담 시간 | `/doctors/[doctorId]` | — | 없음 |
| 4 | 상담 시간 선택 → 진료 생성 | (action) | `draft` (슬롯 점유 안 함) | — |
| 5 | 문진 + 동의 (+ 선택: 셀카·AI 목표 이미지) | `/consult/[id]/intake` | `draft` | S1·S4 |
| 6 | 신청 완료 | `/consult/[id]/requested` | `requested` (슬롯 booked) | 없음 |
| 7 | 내 예약 현황 — 상태 확인·입장 | `/reservations` | requested → scheduled → in_call → done / declined | 없음 |
| 8 | 예약 성사 (의원이 수락) | — | `scheduled` | — |
| 9 | 진료 화면 진입(대기실) — 상담 10분 전 또는 의사가 진료 시작하면 입장 | `/consult/[id]` | scheduled / in_call | — |
| 10 | 화상 통화(진료) | video 앱 | `in_call` | S5 (팀원) |
| 11 | 진료 완료 | `/consult/[id]/done` | in_call / done | 없음 |
| 12 | 의사 노트 + 확정 견적 → 체류 일정 → 시술 예약 | `/quote/[id]` → `/quote/[id]/trip` | (quotes) | S3·S6 |
| 13 | 귀국 후 사후관리 | `/aftercare` | (followups) | — |

- 기존 `/intake`·`/photos`는 리다이렉트만 한다(최신 draft의 문진 또는 `/doctors`).
- 거절(`declined`)되면 사유가 예약 현황·대기실에 보이고 슬롯은 다시 열린다.

## 의원 (`/[lang]/clinic/…`)
| 단계 | 경로 | 동작 |
|---|---|---|
| 신청 확인 | `/clinic` | `requested`가 맨 위 |
| 문진 검토 → 수락/거절 | `/clinic/consult/[id]` (S2) | 수락 = `scheduled`, 거절 = `declined` + 사유 + 슬롯 반환 |
| 진료 시작 → 통화 → 노트·견적 확정 | 같은 화면 | `in_call` → `done`, 견적 `confirmed` |
| 사후관리 검토 | `/clinic/aftercare` | 기존 |

## 범위 밖
의원 스케줄 관리 화면(슬롯은 시드), 알림 발송(이메일·LINE), 결제, 동시 신청 경합의 정교한 처리.
