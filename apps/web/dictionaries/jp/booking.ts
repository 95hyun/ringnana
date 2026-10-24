// flow-v2 작업 3(문진 이동·신청 완료·내 예약) 소유 — 키를 추가하면 ko/booking.ts에도 같은 키를 넣는다
const booking = {
  nav: {
    reservations: "予約",
  },
  // 예약 요약 카드 (S6 Clinic 카드 패턴)
  summary: {
    title: "ご予約内容",
    doctor: "{name} 医師",
    doctorFallback: "担当医",
    clinicFallback: "クリニック",
    time: "相談日時",
    timePending: "日時は調整中です",
    station: "最寄り駅 · {station}",
  },
  intake: {
    eyebrow: "予約の問診",
    goal: {
      title: "なりたい肌のイメージ（AI）",
      optional: "任意",
      lead: "セルフィーを1枚送ると、選んだお悩みに合わせた目標イメージを作れます。送らなくても申し込めます。",
      needConcern: "先に問診でお悩みを選ぶと、イメージを作れます。",
      sent: "写真を受け取りました。申し込みと一緒に医師に共有されます。",
    },
    slotTaken: {
      title: "この時間はすでに埋まりました",
      body: "申し訳ありません。ほかの方の申し込みが先に確定しました。医師のプロフィールから別の時間をお選びください。",
      cta: "医師のプロフィールへ",
    },
    errors: {
      notDraft: "この予約はすでに申し込み済みです",
      failed: "申し込みに失敗しました。もう一度お試しください",
    },
  },
  requested: {
    eyebrow: "申し込み完了",
    title: "予約を申し込みました",
    lead: "医師が問診を確認したあと予約が確定します。確定すると予約一覧に「予約確定」と表示されます。",
    nextTitle: "このあとの流れ",
    next: ["医師が問診の内容を確認します", "予約が確定すると、予約一覧に表示されます", "相談の10分前から診察室に入れます"],
    toReservations: "予約一覧へ",
  },
  reservations: {
    eyebrow: "予約一覧",
    title: "あなたの予約",
    lead: "申し込んだ相談の状況を確認できます。医師が問診を確認すると予約が確定します。",
    listTitle: "相談の予約",
    empty: "まだ予約はありません。",
    emptyHint: "お悩みに合う医師を探して、相談の時間を選びましょう。",
    findDoctor: "医師を探す",
    status: {
      draft: "作成中",
      requested: "医師確認中",
      scheduled: "予約確定",
      in_call: "診察中",
      done: "診察完了",
      declined: "見送り",
      cancelled: "キャンセル",
    },
    continueIntake: "問診の続きを書く",
    join: "診察室に入る",
    joinSoon: "相談の10分前から入室できます",
    viewDone: "診察のまとめを見る",
    declineReason: "理由: {reason}",
    declineNote: "この時間は予約できませんでした。別の医師・時間をお選びください。",
  },
};

export default booking;
