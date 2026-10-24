// 의료 용어 대역표 (spec §6.5, §12). 처음 몇 개로 시작하고 현장에서 고친다.
export type GlossaryEntry = { ko: string; ja: string };

export const glossary: readonly GlossaryEntry[] = [
  { ko: "레이저 토닝", ja: "レーザートーニング" },
  { ko: "기미", ja: "肝斑" },
  { ko: "잡티", ja: "シミ" },
  { ko: "색소", ja: "色素" },
  { ko: "색소 침착", ja: "色素沈着" },
  { ko: "홍조", ja: "赤ら顔" },
  { ko: "모공", ja: "毛穴" },
  { ko: "여드름", ja: "ニキビ" },
  { ko: "여드름 흉터", ja: "ニキビ跡" },
  { ko: "피코 레이저", ja: "ピコレーザー" },
  { ko: "보톡스", ja: "ボトックス" },
  { ko: "필러", ja: "ヒアルロン酸注入" },
  { ko: "시술", ja: "施術" },
  { ko: "회 (시술 횟수)", ja: "回" },
  { ko: "주 간격", ja: "週間隔" },
  { ko: "다운타임", ja: "ダウンタイム" },
  { ko: "자외선 차단제", ja: "日焼け止め" },
];

export function glossaryLines(): string {
  return glossary.map((e) => `- ${e.ko} = ${e.ja}`).join("\n");
}
