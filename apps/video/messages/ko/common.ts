import type { Messages } from "../types";
import type { common as ja } from "../ja/common";

// 환자 화면 문구 (한국어판) — ja와 같은 키
export const common: Messages<typeof ja> = {
  langJa: "日本語",
  langKo: "한국어",
  langToggleLabel: "표시 언어",
  invalidLink: "입장 링크가 올바르지 않습니다. 다시 시도해 주세요.",
  checking: "진료를 확인하고 있습니다…",
  notFound: "진료를 찾을 수 없습니다",
  superseded: "다른 창에서 입장했습니다",
  retry: "다시 시도",
};
