import type { CaptionPayload } from "@/video/lib/contracts";

export type CaptionList = { items: CaptionPayload[]; seen: ReadonlySet<string> };

export const emptyCaptionList = (): CaptionList => ({ items: [], seen: new Set() });

// 같은 id는 화면에서 밀려난 뒤에도 다시 표시·읽기하지 않는다 (spec §6.2)
export function addCaption(list: CaptionList, cap: CaptionPayload, max: number): { list: CaptionList; added: boolean } {
  if (list.seen.has(cap.id)) return { list, added: false };
  const seen = new Set(list.seen);
  seen.add(cap.id);
  return { list: { items: [...list.items, cap].slice(-max), seen }, added: true };
}

export type SelfCaption = {
  id: string;
  srcText: string;
  dstText?: string;
  pending: boolean;
  failed?: boolean;
};

// 내 발화: 원문을 먼저 넣고(pending) 번역 응답이 오면 같은 id를 채운다
export function upsertSelfCaption(
  items: SelfCaption[],
  item: SelfCaption,
  max: number,
  opts: { insert?: boolean } = {},
): SelfCaption[] {
  const idx = items.findIndex((i) => i.id === item.id);
  if (idx >= 0) return items.map((i, n) => (n === idx ? item : i));
  if (opts.insert === false) return items;
  return [...items, item].slice(-max);
}
