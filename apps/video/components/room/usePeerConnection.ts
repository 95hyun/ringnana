"use client";
import { useEffect, useRef, useState } from "react";
import type { Role, RoomEvent, SignalPayload } from "@/lib/contracts";
import { acceptSignal, peerKey, type KnownTabs, type ValidTabs } from "@/lib/room/presence";

type Args = {
  role: Role;
  tabId: string;
  localStream: MediaStream | null;
  mediaSettled: boolean; // 환자: 장치 요청이 끝났는지(성공·실패) — 끝나기 전에 받은 제안은 미뤘다가 처리
  iceServers: RTCIceServer[] | null;
  valid: ValidTabs;
  known: KnownTabs;
  send: (e: RoomEvent) => void;
  on: (h: (e: RoomEvent) => void) => () => void;
};

const MAX_HELD = 100;
// 의사: 제안 뒤 이 시간 안에 응답이 없으면 한 번 더 제안한다 (제안이 상대에게 버려졌을 때 대비)
const ANSWER_TIMEOUT_MS = 5000;

// spec §4.3: 연결 제안은 의사만 한다. 상대의 유효한 창하고만 연결한다.
export function usePeerConnection({ role, tabId, localStream, mediaSettled, iceServers, valid, known, send, on }: Args) {
  const [remote, setRemote] = useState<{ key: string; stream: MediaStream } | null>(null);
  const [restartTick, setRestartTick] = useState(0);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pcKeyRef = useRef<string | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const heldRef = useRef<SignalPayload[]>([]);
  const deferredOfferRef = useRef<SignalPayload | null>(null);
  const latest = useRef({ role, tabId, localStream, mediaSettled, iceServers, valid, known, send });
  const answerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reofferedKeyRef = useRef<string | null>(null);

  const peerRole: Role = role === "doctor" ? "patient" : "doctor";
  const currentPeerKey = peerKey(valid[peerRole]);

  useEffect(() => {
    latest.current = { role, tabId, localStream, mediaSettled, iceServers, valid, known, send };
  });

  // 연결 처리 함수들은 항상 최신 값을 latest 에서 읽는다
  const fns = useRef({
    close() {
      if (answerTimerRef.current) clearTimeout(answerTimerRef.current);
      answerTimerRef.current = null;
      pcRef.current?.close();
      pcRef.current = null;
      pcKeyRef.current = null;
    },
    create(key: string) {
      const L = latest.current;
      fns.current.close();
      const pc = new RTCPeerConnection({ iceServers: L.iceServers ?? [] });
      pcRef.current = pc;
      pcKeyRef.current = key;
      const stream = L.localStream;
      stream?.getTracks().forEach((t) => pc.addTrack(t, stream));
      pc.onicecandidate = (e) => {
        if (!e.candidate || pcRef.current !== pc) return;
        const { role: from, tabId: me } = latest.current;
        latest.current.send({ type: "signal", payload: { from, tabId: me, kind: "ice", data: e.candidate.toJSON() } });
      };
      pc.ontrack = (e) => {
        if (pcRef.current !== pc) return;
        setRemote({ key, stream: e.streams[0] ?? new MediaStream([e.track]) });
      };
      pc.onconnectionstatechange = () => {
        // 연결이 끊기면 의사가 새로 제안한다
        if (pcRef.current === pc && pc.connectionState === "failed" && latest.current.role === "doctor") {
          fns.current.close();
          setRestartTick((n) => n + 1);
        }
      };
      return pc;
    },
    async flushIce(pc: RTCPeerConnection) {
      const list = pendingIceRef.current.splice(0);
      for (const c of list) await pc.addIceCandidate(c).catch(() => {});
    },
    async offer(key: string) {
      pendingIceRef.current = [];
      const pc = fns.current.create(key);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (pcRef.current !== pc || !offer.sdp) return;
        const { role: from, tabId: me } = latest.current;
        latest.current.send({ type: "signal", payload: { from, tabId: me, kind: "offer", data: { type: offer.type, sdp: offer.sdp } } });
        if (reofferedKeyRef.current === key) return;
        answerTimerRef.current = setTimeout(() => {
          answerTimerRef.current = null;
          if (pcRef.current !== pc || pc.signalingState !== "have-local-offer") return;
          reofferedKeyRef.current = key;
          fns.current.close();
          setRestartTick((n) => n + 1);
        }, ANSWER_TIMEOUT_MS);
      } catch (e) {
        console.error("[room] offer 실패", e);
      }
    },
    async answer(sig: SignalPayload) {
      if (sig.kind !== "offer") return;
      const doctor = latest.current.valid.doctor;
      const pc = fns.current.create(peerKey(doctor) ?? `${sig.tabId}:0`);
      try {
        await pc.setRemoteDescription(sig.data);
        await fns.current.flushIce(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (pcRef.current !== pc || !answer.sdp) return;
        const { role: from, tabId: me } = latest.current;
        latest.current.send({ type: "signal", payload: { from, tabId: me, kind: "answer", data: { type: answer.type, sdp: answer.sdp } } });
      } catch (e) {
        console.error("[room] answer 실패", e);
      }
    },
    async handle(sig: SignalPayload) {
      const L = latest.current;
      const decision = acceptSignal(sig, L.role, L.valid, L.known);
      if (decision === "ignore") return;
      if (decision === "hold") {
        heldRef.current.push(sig);
        if (heldRef.current.length > MAX_HELD) heldRef.current.shift();
        return;
      }
      if (sig.kind === "offer") {
        if (L.role !== "patient") return;
        // 새 제안 뒤에 오는 후보만 이 연결의 것이다
        pendingIceRef.current = [];
        if (!L.mediaSettled) {
          deferredOfferRef.current = sig;
          return;
        }
        await fns.current.answer(sig);
      } else if (sig.kind === "answer") {
        const pc = pcRef.current;
        if (L.role !== "doctor" || !pc || pc.signalingState !== "have-local-offer") return;
        try {
          await pc.setRemoteDescription(sig.data);
          await fns.current.flushIce(pc);
        } catch (e) {
          console.error("[room] answer 적용 실패", e);
        }
      } else if (sig.kind === "ice") {
        const pc = pcRef.current;
        if (pc && pc.remoteDescription && !deferredOfferRef.current) await pc.addIceCandidate(sig.data).catch(() => {});
        else pendingIceRef.current.push(sig.data);
      }
    },
  });

  // 신호 수신
  useEffect(
    () =>
      on((ev) => {
        if (ev.type === "signal") void fns.current.handle(ev.payload);
      }),
    [on],
  );

  // Presence 가 바뀌면 보류했던 신호를 다시 판단
  useEffect(() => {
    const held = heldRef.current.splice(0);
    held.forEach((s) => void fns.current.handle(s));
  }, [valid, known]);

  // 환자: 장치 요청이 끝나면 미뤄 둔 제안에 답한다
  useEffect(() => {
    if (role !== "patient" || !mediaSettled || !deferredOfferRef.current) return;
    const sig = deferredOfferRef.current;
    deferredOfferRef.current = null;
    if (acceptSignal(sig, role, latest.current.valid, latest.current.known) === "accept") void fns.current.answer(sig);
  }, [role, mediaSettled]);

  // 상대 유효한 창이 없어지거나 바뀌면 연결 정리. 의사는 내 영상 + 환자 입장이 갖춰지면 제안.
  useEffect(() => {
    if (!currentPeerKey) {
      fns.current.close();
      pendingIceRef.current = [];
      return;
    }
    if (role === "patient") {
      if (pcKeyRef.current && pcKeyRef.current !== currentPeerKey) fns.current.close();
      return;
    }
    if (!localStream || !iceServers) return;
    if (pcRef.current && pcKeyRef.current === currentPeerKey) return;
    void fns.current.offer(currentPeerKey);
  }, [role, currentPeerKey, localStream, iceServers, restartTick]);

  // 화면을 떠날 때 연결을 닫는다
  useEffect(() => () => fns.current.close(), []);

  return { remoteStream: remote && remote.key === currentPeerKey ? remote.stream : null };
}
