# design.md — Ringnana 스타일 가이드

> 출처: 사용자 제공 `design.md` (Style C: Blue + Blush), 2026-10-24 도입. 원문은 아래 그대로 두고, **이 머리말의 적용 규칙이 원문보다 우선**한다.
> 원문이 언급하는 `screen-spec.md`·`SPEC.md`·S1~S6 화면 번호는 이 레포에 없다 — 화면 구조는 `docs/scope.md`·`demo-scenario.md`를 따른다.

## 적용 규칙 (2026-10-24 사용자 결정)
| 원문 규칙 | Ringnana 적용 |
|---|---|
| 가격은 어디에도 넣지 않는다 | **의사가 확정한 개인 견적(금액)은 유지한다** — 핵심 기능. 랜딩 가격대·할인·광고성 가격은 금지(ux-review B4 취소) |
| 전후 사진 금지 | **다른 사용자의 사진·전후 비교를 보여주지 않는다**는 뜻. 본인 셀카와 본인 AI 이미지는 허용(AI Label·Sample image 규칙 적용) |
| (추가) AI 이미지의 의미 | **'시술 후 예측'이 아니라 환자의 '목표 이미지'**(なりたい肌のイメージ / 원하는 피부 이미지). 효과를 예측·보장하는 표현 금지. 의사가 진료에서 가능 범위를 설명한다 |
| "진료·진단" 용어 금지 → Pre-visit Consultation | **적용하지 않는다** — 현재 용어(診察·진료·医師の所見 등) 유지 |
| 워드마크 `[Service Name]` | `Ringnana` |
| S6 응급 안내 = `danger` | 체크인 이상 증상 시 "가까운 의료기관" 안내 카드가 여기에 해당. 그 밖의 빨강(금기 플래그, 의원 '이상 보고' 배지)은 `warning` 계열로 바꾼다 |
| 영어 문구 예(`Doctor confirmed`, `AI draft`, Disclaimer 문구) | 스타일만 따르고 문구는 jp·ko 사전으로 현지화 |
| 2단 레이아웃(좌7/우5) | 랜딩·의원 진료 상세에 적용. 환자 플로우 화면은 모바일 1단 유지 |
| 헤더 우측 "역할 배지 + 전환 버튼" | 데모용 환자↔의원 화면 전환으로 구현(P1) |

---

# design.md — 스타일 가이드 (Style C: Blue + Blush)

> 개발 전달용. 화면 구조는 `screen-spec.md`, 기획은 `SPEC.md`를 따른다.
> 컴포넌트는 shadcn/ui + Tailwind 기본을 쓰고, 이 문서의 토큰으로 색·글꼴만 맞춘다. Figma 없음.

## 1. 원칙

**톤 3줄**
1. 병원처럼 차분하고 깨끗하게
2. 의사 판단이 주인공, AI는 보조로 보이게
3. 과장 문구·이모지 없음

**금지 규칙**
- 화면에 "진료·진단·진단서(diagnosis, treatment record)"를 쓰지 않는다. `Pre-visit Consultation`, `Doctor's Pre-visit Note`를 쓴다.
- 후기, 전후 사진, 병원 랭킹, 가격은 어디에도 넣지 않는다.
- 색은 역할마다 하나. 앰버는 금기·판단 보류에만, 빨강은 S6 응급 안내에만 쓴다.
- 다크 모드는 지원하지 않는다(라이트만).

## 2. 색상

### 2-1. 토큰

| 토큰 | HEX | 용도 |
|---|---|---|
| `primary` | `#2F62C8` | 주요 버튼, 링크, `Doctor confirmed` 배지, focus 링 |
| `primary-hover` | `#244C9C` | 주요 버튼 hover, 의사 배지 글자 |
| `primary-tint` | `#EAF0FB` | 의사 배지 배경, 선택된 카드 배경 |
| `blush` | `#9E3550` | 환자 배지 글자, 환자 화면 라벨 |
| `blush-tint` | `#FBEEF1` | 환자 배지 배경, S1·S3 Hero 배경 |
| `warning` | `#C2410C` | Flag chip(high) 채움 |
| `warning-text` | `#9A3412` | Hold chip·Flag chip(medium) 글자 |
| `warning-tint` | `#FFF4E8` | Hold chip 배경, 판단 보류 카드 배경 |
| `danger` | `#B91C1C` | S6 응급 안내 카드 전용 |
| `background` | `#F7F8FA` | 페이지 배경 |
| `surface` | `#FFFFFF` | 카드, 모달, 입력 |
| `border` | `#E2E5EA` | 카드 보더, 구분선 |
| `border-strong` | `#CDD3DC` | outline 버튼, 입력 보더 |
| `foreground` | `#1C1C1A` | 본문·제목 |
| `muted-foreground` | `#5C5C57` | 보조 설명, 라벨, Disclaimer |
| `disclaimer-bg` | `#F1F3F6` | Disclaimer Bar 배경 |

### 2-2. 대비 확인 (WCAG AA 4.5:1 이상)

| 조합 | 대비 | 결과 |
|---|---|---|
| 흰 글자 on `primary` | 약 5.6:1 | 통과 |
| `blush` on `blush-tint` | 약 6:1 | 통과 |
| 흰 글자 on `warning` | 약 5.2:1 | 통과 |
| `muted-foreground` on `background` | 약 6:1 | 통과 |

- 대비 값은 계산 근사치. 새 조합을 만들면 다시 확인한다.

### 2-3. shadcn CSS 변수 (`globals.css`)

```css
:root {
  --background: #F7F8FA;
  --foreground: #1C1C1A;
  --card: #FFFFFF;
  --card-foreground: #1C1C1A;
  --popover: #FFFFFF;
  --popover-foreground: #1C1C1A;
  --primary: #2F62C8;
  --primary-foreground: #FFFFFF;
  --secondary: #FBEEF1;
  --secondary-foreground: #9E3550;
  --muted: #F1F3F6;
  --muted-foreground: #5C5C57;
  --accent: #EAF0FB;
  --accent-foreground: #244C9C;
  --destructive: #B91C1C;
  --border: #E2E5EA;
  --input: #CDD3DC;
  --ring: #2F62C8;
  --radius: 12px;

  /* custom */
  --primary-hover: #244C9C;
  --warning: #C2410C;
  --warning-foreground: #9A3412;
  --warning-tint: #FFF4E8;
}
```

## 3. 타이포그래피

**폰트:** 영문·숫자 Inter, 일본어 Noto Sans JP (Google Fonts, 400·500·600)

```css
--font-sans: "Inter", "Noto Sans JP", system-ui, sans-serif;
```

| 토큰 | 크기 / 굵기 / 행간 | Tailwind | 쓰는 곳 |
|---|---|---|---|
| Hero title | 32px / 600 / 1.25 | `text-[32px] font-semibold leading-tight` | S1 첫 문장 |
| Page title | 24px / 600 / 1.3 | `text-2xl font-semibold` | 화면 제목 |
| Metric | 28px / 600, 숫자 고정폭 | `text-[28px] font-semibold tabular-nums` | `Reviewed in 45s` |
| Card title | 16px / 600 / 1.4 | `text-base font-semibold` | 카드 제목 |
| Body | 15px / 400 / 1.6 | `text-[15px] leading-relaxed` | 본문 |
| Body (일본어) | 15px / 400 / 1.7 | `text-[15px] leading-[1.7]` + `lang="ja"` | 문진, 소견서 |
| Caption | 13px / 400 / 1.5 | `text-[13px]` | 설명, Disclaimer |
| Label | 12px / 500 / 1.4 | `text-xs font-medium` | 칩, 배지, `AI draft` |

- 일본어가 들어가는 요소에는 `lang="ja"`를 붙인다.

## 4. 형태·간격·아이콘

| 항목 | 값 |
|---|---|
| Radius | 카드·모달 12px / 버튼·입력 10px / 칩·배지 999px |
| 그림자 | `shadow-sm` 하나만. hover에서도 추가하지 않음 |
| 간격 | 4px 단위: 8, 12, 16, 24, 32 |
| 버튼·터치 높이 | 44px 이상 |
| 아이콘 | lucide-react, `strokeWidth={1.75}`, 기본 18px. 이모지 금지 |

## 5. 컴포넌트

### 5-1. 버튼

| 종류 | 기본 | hover | focus | disabled |
|---|---|---|---|---|
| Primary | `primary` 배경, 흰 글자 600 | `primary-hover` 배경 | `ring` 2px + offset 2px | 40% 투명, 커서 not-allowed |
| Outline | 흰 배경, `border-strong` 보더, `foreground` 글자 500 | 배경 `muted` | 동일 | 동일 |
| Ghost | 배경 없음, `muted-foreground` 글자 | 배경 `muted` | 동일 | 동일 |

- 화면당 Primary는 하나만 둔다(`Submit`, `Send to doctor`, `Doctor Confirm` 등).

### 5-2. 입력

- 흰 배경, `input` 보더, radius 10px, 높이 44px(textarea 제외)
- focus: `ring` 2px. 에러 상태는 데모에서 쓰지 않음

### 5-3. 배지·칩

| 컴포넌트 | 스타일 | 문구 예 |
|---|---|---|
| Role Badge — Patient | `blush-tint` 배경, `blush` 글자 | `Patient` |
| Role Badge — Doctor | `primary-tint` 배경, `primary-hover` 글자 | `Doctor` |
| AI Label | 투명 배경, `#C5CBD4` 1px 보더, `muted-foreground` 글자 | `AI draft` |
| Doctor confirmed | `primary` 채움, 흰 글자 | `Doctor confirmed` |
| Flag chip — high | `warning` 채움, 흰 글자 + 경고 아이콘 | `Isotretinoin · High` |
| Flag chip — medium | `warning` 1px 보더, `warning-text` 글자 | |
| Hold chip | `warning-tint` 배경, `warning-text` 글자 | `Needs in-person check` |

- AI Label은 일부러 눈에 덜 띄게, Doctor confirmed는 눈에 띄게 한다(원칙 2).

### 5-4. 카드

- 흰 배경, `border` 1px, radius 12px, `shadow-sm`, 패딩 20px(데스크톱) / 16px(모바일)
- 선택된 후보 카드: 보더 `primary` 1.5px + 배경 `primary-tint`
- 판단 보류 카드: 배경 `warning-tint`, 보더 `#F3D9BF`, 경고 아이콘

### 5-5. Loading Card

- 스켈레톤(배경 `muted`) + 단계 문구 3개가 차례로 바뀜
  `Checking photo quality… → Summarizing intake… → Tagging concerns…`
- 문구 전환은 **페이드 200ms**. 그 외 애니메이션은 쓰지 않는다.
- 하단 캡션: `This usually takes about 30 seconds.`

### 5-6. Disclaimer Bar

- 배경 `disclaimer-bg`, 13px `muted-foreground`, radius 10px, 패딩 12px 16px
- 문구: `Pre-visit consultation only. Final decision at in-person visit.`

### 5-7. 응급 안내 카드 (S6 전용)

- `danger` 채움, 흰 글자, 경고 아이콘 24px
- 빨강은 이 카드에서만 쓴다.

## 6. 레이아웃

| 항목 | 값 |
|---|---|
| 기준 프레임 | Desktop 1440 × 900 |
| 콘텐츠 최대 폭 | 1200px, 좌우 auto |
| 그리드 | 12컬럼, 거터 24px |
| 2단 배치 | 좌 7컬럼 / 우 5컬럼 (S1, S2, S3 공통) |
| 반응형 | S1·S3는 390px에서 1단으로 쌓임. S2는 데스크톱 전용 |
| Header | 높이 64px, 흰 배경, 하단 `border`. 좌 워드마크 / 중 단계 표시 / 우 역할 배지 + 전환 버튼 |
| 워드마크 | `[Service Name]` 텍스트, Inter 18px 600. 서비스명 확정 시 교체 |

## 7. 이미지

- 모든 인물 이미지는 생성된 가상 인물. 목록·프롬프트는 `screen-spec.md` §3.
- 이미지 좌하단에 라벨 `Sample image`: 12px 흰 글자, 배경 `rgba(0,0,0,0.55)`, radius 6px, 여백 8px
- 사진 비율 4:5, 영상 16:9. `object-fit: cover`
- 전후 비교처럼 보이는 연출 금지. 경과 사진은 "시술 직후 / D+3" 확인용으로만 쓴다.
- 지도는 이미지 대신 회색 placeholder + `Map` 텍스트.

## 8. 미정

- [ ] 서비스명 → 워드마크 교체
- [ ] 일본어 라벨·소견서 문구 원어민 검수
