// 환자 화면 문구 (일본어판). 각 작업이 자기 파일만 채운다.
export const call = {
  preparingDevice: "カメラとマイクを準備しています…",
  deviceDenied: "カメラとマイクの許可が必要です。アドレスバーのカメラアイコンから許可してください",
  deviceNotFound: "カメラが見つかりません",
  deviceInUse: "他のアプリでカメラが使用中です。終了してからもう一度お試しください",
  peerWaiting: "医師をお待ちください",
  peerConnected: "医師と接続しました",
  micOff: "マイクをオフ",
  micOn: "マイクをオン",
  micMutedBadge: "マイクオフ中",
  enableSound: "音声をオンにする",
  endCall: "通話を終了",
  ending: "通話を終了しています…",
  callEnded: "通話が終了しました",
  remoteLabel: "医師",
  selfLabel: "あなた",
} as const;
