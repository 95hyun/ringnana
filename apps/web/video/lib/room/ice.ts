export type IceEnv = { TURN_URLS?: string; TURN_USERNAME?: string; TURN_CREDENTIAL?: string };

const FALLBACK_STUN = "stun:stun.l.google.com:19302";

// spec §7.6: 공개 STUN 은 항상, TURN 은 주소와 계정이 모두 있을 때만 더한다
export function buildIceServers(env: IceEnv, publicStun: readonly string[]): RTCIceServer[] {
  const stun = publicStun.length > 0 ? [...publicStun] : [FALLBACK_STUN];
  const list: RTCIceServer[] = [{ urls: stun }];
  const turnUrls = (env.TURN_URLS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (turnUrls.length > 0 && env.TURN_USERNAME && env.TURN_CREDENTIAL) {
    list.push({ urls: turnUrls, username: env.TURN_USERNAME, credential: env.TURN_CREDENTIAL });
  }
  return list;
}
