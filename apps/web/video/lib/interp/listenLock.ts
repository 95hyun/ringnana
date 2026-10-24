import type { LocalLink } from "@/video/lib/room/demo";

export type ListenLock = {
  // 다른 창이 듣는 중이면 false
  acquire: () => boolean;
  release: () => void;
  lockedByOther: () => boolean;
  dispose: () => void;
};

// spec §16: 시연 모드에서 한 번에 한 창만 듣는다. 해제 알림이 사라져도 maxMs 뒤에는 풀린다.
export function createListenLock({
  link,
  tabId,
  maxMs,
  onChange,
  onPreempted,
}: {
  link: LocalLink;
  tabId: string;
  maxMs: number;
  onChange: (lockedByOther: boolean) => void;
  onPreempted: () => void;
}): ListenLock {
  let holder: string | null = null;
  let mine = false;
  let expiry: ReturnType<typeof setTimeout> | undefined;

  const setHolder = (next: string | null) => {
    clearTimeout(expiry);
    if (next) expiry = setTimeout(() => setHolder(null), maxMs);
    if (next !== holder) {
      holder = next;
      onChange(holder !== null);
    }
  };

  const unsub = link.subscribe((m) => {
    if (m.kind !== "listen" || m.tabId === tabId) return;
    if (!m.on) {
      if (holder === m.tabId) setHolder(null);
      return;
    }
    // 두 창이 동시에 누르면 tabId 가 작은 쪽이 이긴다
    if (mine) {
      if (m.tabId > tabId) return;
      mine = false;
      onPreempted();
    }
    setHolder(m.tabId);
  });

  return {
    acquire() {
      if (holder) return false;
      mine = true;
      link.post({ kind: "listen", tabId, on: true });
      return true;
    },
    release() {
      if (!mine) return;
      mine = false;
      link.post({ kind: "listen", tabId, on: false });
    },
    lockedByOther: () => holder !== null,
    dispose() {
      if (mine) link.post({ kind: "listen", tabId, on: false });
      mine = false;
      clearTimeout(expiry);
      unsub();
    },
  };
}
