import type { LocalLink, LocalMessage } from "./demo";

// 테스트용: 같은 브라우저 창들 사이 통로 흉내 (BroadcastChannel 처럼 자기 자신에게는 보내지 않는다)
export function createFakeLocalBus() {
  const members = new Map<LocalLink, Set<(m: LocalMessage) => void>>();
  const cutOff = new Set<LocalLink>();
  return {
    link(): LocalLink {
      const subs = new Set<(m: LocalMessage) => void>();
      const link: LocalLink = {
        post(m) {
          if (cutOff.has(link)) return;
          for (const [other, s] of members) if (other !== link) s.forEach((fn) => fn(m));
        },
        subscribe(fn) {
          subs.add(fn);
          return () => {
            subs.delete(fn);
          };
        },
        close: () => members.delete(link),
      };
      members.set(link, subs);
      return link;
    },
    cut: (link: LocalLink) => cutOff.add(link),
  };
}
