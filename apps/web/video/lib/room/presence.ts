import type { PresenceState, Role } from "@/video/lib/contracts";

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

export type KnownTabs = Record<Role, string[]>;

// 역할별로 Presence 에 보이는 모든 tabId (밀려난 창 포함)
export function knownTabs(state: RawPresence): KnownTabs {
  const out: KnownTabs = { doctor: [], patient: [] };
  for (const p of Object.values(state).flatMap((list) => list.map(asPresence))) if (p) out[p.role].push(p.tabId);
  return out;
}

export type SignalDecision = "accept" | "ignore" | "hold";

// Presence 에 있지만 최신이 아닌 창은 무시. Presence 에 아직 없는 창(새 창이 먼저 보낸 신호)은 보류했다가 다시 판단한다.
export function acceptSignal(
  sig: { from: Role; tabId: string },
  selfRole: Role,
  valid: ValidTabs,
  known: KnownTabs,
): SignalDecision {
  if (sig.from === selfRole) return "ignore";
  if (valid[sig.from]?.tabId === sig.tabId) return "accept";
  return known[sig.from].includes(sig.tabId) ? "ignore" : "hold";
}

// 의사의 연결 상대 식별 — 환자가 같은 탭에서 다시 들어와도(joinedAt 변경) 새로 제안한다
export const peerKey = (p: PresenceState | null) => (p ? `${p.tabId}:${p.joinedAt}` : null);
