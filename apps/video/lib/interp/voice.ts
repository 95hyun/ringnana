const norm = (lang: string) => lang.replace(/_/g, "-").toLowerCase();

// 그 언어 음성이 없으면 null → 자막만 보여 준다 (spec §6.1)
export function pickVoice(voices: readonly SpeechSynthesisVoice[], bcp47: string): SpeechSynthesisVoice | null {
  const want = norm(bcp47);
  const base = want.split("-")[0];
  return (
    voices.find((v) => norm(v.lang) === want) ??
    voices.find((v) => norm(v.lang).split("-")[0] === base) ??
    null
  );
}
