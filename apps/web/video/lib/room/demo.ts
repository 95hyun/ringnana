import type { Role } from "@/video/lib/contracts";

// spec §16: 같은 브라우저의 창끼리만 주고받는 통로 (BroadcastChannel). 서버를 거치지 않는다.
export const demoChannelName = (sessionId: string) => `ringnana-video:${sessionId}`;

export type LocalMessage =
  | { kind: "hello" | "here" | "bye"; role: Role; tabId: string }
  | { kind: "listen"; tabId: string; on: boolean };

export type LocalLink = {
  post: (m: LocalMessage) => void;
  subscribe: (fn: (m: LocalMessage) => void) => () => void;
  close: () => void;
};

// BroadcastChannel 이 없는 환경(서버 렌더 등)에서는 null — 시연 모드 자동 감지만 꺼진다
export function openLocalLink(sessionId: string): LocalLink | null {
  if (typeof BroadcastChannel === "undefined") return null;
  const bc = new BroadcastChannel(demoChannelName(sessionId));
  const subs = new Set<(m: LocalMessage) => void>();
  bc.onmessage = (ev: MessageEvent) => {
    const m = ev.data as LocalMessage | null;
    if (m && typeof m === "object" && typeof m.kind === "string") subs.forEach((fn) => fn(m));
  };
  return {
    post: (m) => bc.postMessage(m),
    subscribe(fn) {
      subs.add(fn);
      return () => {
        subs.delete(fn);
      };
    },
    close: () => {
      subs.clear();
      bc.close();
    },
  };
}

export const isDemoMode = (demoParam: boolean, peerWindowOpen: boolean) => demoParam || peerWindowOpen;

// 같은 방의 상대 역할 창이 이 브라우저에 열려 있는지 추적한다. 신호가 끊기면(창 닫힘·멈춤) 사라진 것으로 본다.
export function trackPeerWindow({
  link,
  role,
  tabId,
  heartbeatMs,
  timeoutMs,
  onChange,
  now = () => Date.now(),
}: {
  link: LocalLink;
  role: Role;
  tabId: string;
  heartbeatMs: number;
  timeoutMs: number;
  onChange: (open: boolean) => void;
  now?: () => number;
}): () => void {
  const seen = new Map<string, number>();
  let open = false;
  const update = () => {
    const t = now();
    for (const [id, at] of seen) if (t - at > timeoutMs) seen.delete(id);
    const next = seen.size > 0;
    if (next !== open) {
      open = next;
      onChange(open);
    }
  };
  const unsub = link.subscribe((m) => {
    if (m.kind === "listen" || m.tabId === tabId) return;
    if (m.kind === "hello") link.post({ kind: "here", role, tabId });
    if (m.role === role) return;
    if (m.kind === "bye") seen.delete(m.tabId);
    else seen.set(m.tabId, now());
    update();
  });
  link.post({ kind: "hello", role, tabId });
  const timer = setInterval(() => {
    link.post({ kind: "here", role, tabId });
    update();
  }, heartbeatMs);
  return () => {
    clearInterval(timer);
    unsub();
    link.post({ kind: "bye", role, tabId });
  };
}
