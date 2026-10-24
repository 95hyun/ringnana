export type TtsItem = { text: string; lang: string };

export type TtsSpeaker = {
  // 읽기 시작하면 true, 그 언어 음성이 없어 읽을 수 없으면 false. 끝나면(실패 포함) done 호출
  speak: (text: string, lang: string, done: () => void) => boolean;
  cancel: () => void;
};

// 도착 순서대로 하나씩 읽는다 (spec §6.3). speaking 동안 내 인식 결과는 버린다.
export class TtsQueue {
  private queue: TtsItem[] = [];
  private current = 0; // 지금 읽는 문장 번호 (0 = 없음) — 늦게 온 done 무시용
  private seq = 0;
  private reported = false;
  private lastEndAt = -Infinity;
  private tailMs: number;
  private now: () => number;

  constructor(
    private speaker: TtsSpeaker,
    private onSpeakingChange?: (speaking: boolean) => void,
    opts: { tailMs?: number; now?: () => number } = {},
  ) {
    this.tailMs = opts.tailMs ?? 0;
    this.now = opts.now ?? Date.now;
  }

  get speaking(): boolean {
    return this.current !== 0;
  }

  shouldDiscardRecognition(): boolean {
    // 인식 확정은 소리보다 조금 늦게 오므로 끝난 직후 tailMs 동안도 버린다
    return this.speaking || this.now() - this.lastEndAt < this.tailMs;
  }

  enqueue(item: TtsItem): void {
    this.queue.push(item);
    if (!this.speaking) this.next();
  }

  clear(): void {
    this.queue = [];
    this.current = 0;
    this.speaker.cancel();
    this.report();
  }

  private report(): void {
    if (this.reported === this.speaking) return;
    this.reported = this.speaking;
    if (!this.reported) this.lastEndAt = this.now();
    this.onSpeakingChange?.(this.reported);
  }

  private next(): void {
    while (this.queue.length > 0 && this.current === 0) {
      const item = this.queue.shift()!;
      const id = ++this.seq;
      this.current = id;
      const started = this.speaker.speak(item.text, item.lang, () => {
        if (this.current !== id) return;
        this.current = 0;
        this.next();
      });
      if (!started && this.current === id) this.current = 0;
    }
    this.report();
  }
}
