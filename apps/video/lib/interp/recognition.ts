// Web Speech API 타입 (TS 기본 lib에 없어서 필요한 만큼만 둔다)
export type RecognitionResultEvent = {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
};

export type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((ev: RecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type RecognitionCtor = new () => SpeechRecognitionLike;

export function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function collectResults(ev: RecognitionResultEvent): { finals: string[]; interim: string } {
  const finals: string[] = [];
  let interim = "";
  for (let i = ev.resultIndex; i < ev.results.length; i++) {
    const r = ev.results[i];
    const text = r[0]?.transcript ?? "";
    if (r.isFinal) {
      const t = text.trim();
      if (t) finals.push(t);
    } else {
      interim += text;
    }
  }
  return { finals, interim: interim.trim() };
}
