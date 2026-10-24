// 공통 틀·버튼 문구 (H1 소유). 키를 추가하면 ko/common.ts에도 같은 키를 넣는다
const common = {
  brand: "Ringnana",
  patientTagline: "韓国皮膚科オンライン診療",
  clinicConsole: "의원 콘솔",
  nav: {
    queue: "진료 큐",
    aftercare: "사후관리",
  },
  actions: {
    next: "次へ",
    back: "戻る",
    submit: "送信",
    save: "保存",
    cancel: "キャンセル",
  },
  steps: {
    intake: "問診",
    photos: "写真",
    consult: "診察",
    quote: "見積",
    aftercare: "ケア",
  },
  stepLabel: "ステップ",
  langSwitcher: "言語を切り替える",
  countries: {
    JP: "日本",
    KR: "韓国",
  },
  timeZones: {
    "Asia/Tokyo": "日本時間",
    "Asia/Seoul": "韓国時間",
  },
  money: {
    approx: "約{amount}",
    rateNote: "{date}時点のレート（{rate}）・お支払いは韓国ウォン建ての確定金額です",
  },
  treatments: {
    pico_toning: "ピコトーニング",
    laser_toning: "レーザートーニング",
    fraxel: "フラクショナルレーザー",
    rejuran: "リジュラン",
    aqua_peel: "アクアピール",
    botox_jaw: "ボトックス（エラ）",
  },
  states: {
    loading: "読み込み中…",
    error: "エラーが発生しました。もう一度お試しください。",
  },
};

export default common;
