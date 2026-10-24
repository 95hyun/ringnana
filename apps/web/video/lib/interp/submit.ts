import type { RoomEvent, Role, TranslateResponse } from "@/video/lib/contracts";
import { upsertSelfCaption } from "./captions";
import { translatePairOf } from "./lang";
import type { InterpStore } from "./store";

// 확정된 내 문장 하나를 번역해 방송한다. 음성 인식 결과와 예시 문장 버튼이 같은 길을 쓴다.
export async function submitUtterance({
  srcText,
  role,
  store,
  send,
  translate,
  maxLines,
  newId = () => crypto.randomUUID(),
}: {
  srcText: string;
  role: Role;
  store: InterpStore;
  send: (ev: RoomEvent) => void;
  translate: (text: string, from: "ko" | "ja", to: "ko" | "ja") => Promise<TranslateResponse>;
  maxLines: number;
  newId?: () => string;
}): Promise<void> {
  const { from, to } = translatePairOf(role);
  const id = newId();
  store.set((s) => ({
    self: upsertSelfCaption(s.self, { id, srcText, pending: true }, maxLines),
    pendingCount: s.pendingCount + 1,
  }));
  const { text, failed } = await translate(srcText, from, to);
  store.set((s) => ({
    self: upsertSelfCaption(s.self, { id, srcText, dstText: text, pending: false, failed }, maxLines, { insert: false }),
    pendingCount: Math.max(0, s.pendingCount - 1),
  }));
  // 응답을 기다리는 사이 [통역]을 껐으면 방송하지 않는다
  if (!store.get().enabled) return;
  send({
    type: "interp:caption",
    payload: { id, speaker: role, srcLang: from, srcText, dstLang: to, dstText: text, failed },
  });
}
