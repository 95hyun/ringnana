import type { TtsSpeaker } from "./ttsQueue";
import { pickVoice } from "./voice";

// Chrome에서 onend가 오지 않는 경우가 있어 글자 수 기준 안전 타이머로 끝낸다
const SAFETY_BASE_MS = 8000;
const SAFETY_PER_CHAR_MS = 250;

export function createBrowserSpeaker(): TtsSpeaker & { dispose: () => void } {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
  if (!synth) return { speak: () => false, cancel: () => {}, dispose: () => {} };
  let voices = synth.getVoices();
  const onVoices = () => {
    voices = synth.getVoices();
  };
  synth.addEventListener("voiceschanged", onVoices);
  return {
    speak(text, lang, done) {
      if (voices.length === 0) voices = synth.getVoices();
      const voice = pickVoice(voices, lang);
      if (!voice) return false;
      const u = new SpeechSynthesisUtterance(text);
      u.voice = voice;
      u.lang = voice.lang;
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        done();
      };
      const timer = setTimeout(finish, SAFETY_BASE_MS + text.length * SAFETY_PER_CHAR_MS);
      u.onend = finish;
      u.onerror = finish;
      synth.speak(u);
      return true;
    },
    cancel() {
      synth.cancel();
    },
    dispose() {
      synth.removeEventListener("voiceschanged", onVoices);
      synth.cancel();
    },
  };
}
