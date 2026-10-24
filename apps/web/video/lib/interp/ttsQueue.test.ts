import { describe, expect, it } from "vitest";
import { TtsQueue, type TtsSpeaker } from "./ttsQueue";

function fakeSpeaker(opts: { canSpeak?: boolean } = {}) {
  const spoken: { text: string; lang: string; done: () => void }[] = [];
  let cancelled = 0;
  const speaker: TtsSpeaker = {
    speak(text, lang, done) {
      if (opts.canSpeak === false) return false;
      spoken.push({ text, lang, done });
      return true;
    },
    cancel() {
      cancelled++;
    },
  };
  return { speaker, spoken, cancelled: () => cancelled };
}

describe("읽기 대기열", () => {
  it("도착 순서대로 하나씩 읽는다", () => {
    const f = fakeSpeaker();
    const q = new TtsQueue(f.speaker);
    q.enqueue({ text: "一", lang: "ja-JP" });
    q.enqueue({ text: "二", lang: "ja-JP" });
    q.enqueue({ text: "三", lang: "ja-JP" });
    expect(f.spoken.map((s) => s.text)).toEqual(["一"]);
    f.spoken[0].done();
    expect(f.spoken.map((s) => s.text)).toEqual(["一", "二"]);
    f.spoken[1].done();
    f.spoken[2].done();
    expect(f.spoken.map((s) => s.text)).toEqual(["一", "二", "三"]);
    expect(f.spoken[0].lang).toBe("ja-JP");
  });

  it("읽는 동안 speaking=true → 인식 결과를 버려야 한다는 신호", () => {
    const f = fakeSpeaker();
    const changes: boolean[] = [];
    const q = new TtsQueue(f.speaker, (s) => changes.push(s));
    expect(q.speaking).toBe(false);
    expect(q.shouldDiscardRecognition()).toBe(false);
    q.enqueue({ text: "一", lang: "ja-JP" });
    q.enqueue({ text: "二", lang: "ja-JP" });
    expect(q.speaking).toBe(true);
    expect(q.shouldDiscardRecognition()).toBe(true);
    f.spoken[0].done();
    // 다음 문장으로 바로 넘어가므로 중간에 false가 되지 않는다
    expect(q.speaking).toBe(true);
    f.spoken[1].done();
    expect(q.speaking).toBe(false);
    expect(q.shouldDiscardRecognition()).toBe(false);
    expect(changes).toEqual([true, false]);
  });

  it("done이 두 번 불려도 다음 문장을 건너뛰지 않는다", () => {
    const f = fakeSpeaker();
    const q = new TtsQueue(f.speaker);
    q.enqueue({ text: "一", lang: "ja-JP" });
    q.enqueue({ text: "二", lang: "ja-JP" });
    q.enqueue({ text: "三", lang: "ja-JP" });
    f.spoken[0].done();
    f.spoken[0].done();
    expect(f.spoken.map((s) => s.text)).toEqual(["一", "二"]);
  });

  it("말할 수 없으면(음성 없음) 건너뛰고 speaking이 남지 않는다", () => {
    const f = fakeSpeaker({ canSpeak: false });
    const changes: boolean[] = [];
    const q = new TtsQueue(f.speaker, (s) => changes.push(s));
    q.enqueue({ text: "一", lang: "ja-JP" });
    expect(q.speaking).toBe(false);
    expect(changes).toEqual([]);
  });

  it("clear는 대기열을 비우고 읽기를 멈춘다", () => {
    const f = fakeSpeaker();
    const changes: boolean[] = [];
    const q = new TtsQueue(f.speaker, (s) => changes.push(s));
    q.enqueue({ text: "一", lang: "ja-JP" });
    q.enqueue({ text: "二", lang: "ja-JP" });
    q.clear();
    expect(f.cancelled()).toBe(1);
    expect(q.speaking).toBe(false);
    // 취소된 문장의 늦은 done은 무시
    f.spoken[0].done();
    expect(f.spoken).toHaveLength(1);
    expect(changes).toEqual([true, false]);
  });

  it("읽기가 끝난 직후 tailMs 동안도 인식 결과를 버린다", () => {
    const f = fakeSpeaker();
    let now = 1000;
    const q = new TtsQueue(f.speaker, undefined, { tailMs: 500, now: () => now });
    q.enqueue({ text: "一", lang: "ja-JP" });
    now = 2000;
    f.spoken[0].done();
    expect(q.speaking).toBe(false);
    now = 2400;
    expect(q.shouldDiscardRecognition()).toBe(true);
    now = 2501;
    expect(q.shouldDiscardRecognition()).toBe(false);
  });
});
