// 촬영 순간에 쓰는 브라우저 도우미 (캔버스 JPEG·셔터음)

/** video 의 현재 프레임을 카메라 원본 해상도·반전 없이 JPEG 로 만든다. */
export function grabJpeg(video: HTMLVideoElement, quality: number): Promise<Blob> {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return Promise.reject(new Error("video not ready"));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext("2d");
  if (!g) return Promise.reject(new Error("no 2d context"));
  g.drawImage(video, 0, 0, w, h);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", quality),
  );
}

/** 사용자 동작 안에서 만들어 두어야 소리가 난다 (자동재생 정책). */
export function createAudio(): AudioContext | null {
  try {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    const ac = new Ctor();
    void ac.resume().catch(() => {});
    return ac;
  } catch {
    return null;
  }
}

/** 짧은 '찰칵' — 잡음 한 번 + 높은 삑. */
export function playShutter(ac: AudioContext | null) {
  if (!ac) return;
  try {
    const t = ac.currentTime;
    const len = Math.floor(ac.sampleRate * 0.06);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
    const noise = ac.createBufferSource();
    noise.buffer = buf;
    const ng = ac.createGain();
    ng.gain.value = 0.5;
    noise.connect(ng).connect(ac.destination);
    noise.start(t);

    const osc = ac.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(1800, t + 0.05);
    const og = ac.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.25, t + 0.06);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    osc.connect(og).connect(ac.destination);
    osc.start(t + 0.05);
    osc.stop(t + 0.18);
  } catch {
    // 소리는 부가 효과 — 실패해도 촬영은 계속
  }
}
