import type { UiLang } from "@/video/lib/contracts";
import * as ja from "./ja";
import * as ko from "./ko";

export const messages = { ja, ko } as const;
export const messagesFor = (lang: UiLang) => messages[lang];
