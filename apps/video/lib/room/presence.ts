import type { PresenceState, Role } from "@/lib/contracts";

export type ValidTabs = { doctor: PresenceState | null; patient: PresenceState | null };
type RawPresence = Record<string, ReadonlyArray<Record<string, unknown>>>;

function asPresence(v: Record<string, unknown>): PresenceState | null {
  const { role, tabId, joinedAt } = v;
  if ((role !== "doctor" && role !== "patient") || typeof tabId !== "string" || typeof joinedAt !== "number") return null;
  return { role, tabId, joinedAt };
}

// 같은 joinedAt 이면 tabId 로 순서를 정해 양쪽 창이 같은 결론을 내게 한다
const later = (a: PresenceState, b: PresenceState) =>
  a.joinedAt !== b.joinedAt ? a.joinedAt > b.joinedAt : a.tabId > b.tabId;

// spec §8: 같은 역할에 여러 값이 있으면 joinedAt 이 가장 늦은 것만 유효
export function validTabs(state: RawPresence, extra: PresenceState[] = []): ValidTabs {
  const out: ValidTabs = { doctor: null, patient: null };
  const all = [...Object.values(state).flatMap((list) => list.map(asPresence)), ...extra];
  for (const p of all) {
    if (!p) continue;
    const cur = out[p.role];
    if (!cur || later(p, cur)) out[p.role] = p;
  }
  return out;
}

// 내 Presence 가 아직 반영되지 않았을 수 있으므로 나를 넣고 판단한다
export function isSuperseded(self: PresenceState, state: RawPresence): boolean {
  return validTabs(state, [self])[self.role]?.tabId !== self.tabId;
}

export type SignalDecision = "accept" | "ignore" | "hold";

// 상대의 유효한 창이 아닌 tabId 는 무시. 상대 역할이 아직 Presence 에 없으면 보류했다가 다시 판단한다.
export function acceptSignal(sig: { from: Role; tabId: string }, selfRole: Role, valid: ValidTabs): SignalDecision {
  if (sig.from === selfRole) return "ignore";
  const v = valid[sig.from];
  if (!v) return "hold";
  return v.tabId === sig.tabId ? "accept" : "ignore";
}

// 의사의 연결 상대 식별 — 환자가 같은 탭에서 다시 들어와도(joinedAt 변경) 새로 제안한다
export const peerKey = (p: PresenceState | null) => (p ? `${p.tabId}:${p.joinedAt}` : null);
