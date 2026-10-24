"use client";
import type { InterpSlotArea, Role, RoomContext } from "@/video/lib/contracts";
import { config } from "@/video/lib/config";
import { interpText, type InterpText } from "@/video/lib/interp/text";
import type { CaptionList, SelfCaption } from "@/video/lib/interp/captions";
import type { InterpState, InterpStore } from "@/video/lib/interp/store";
import { useInterpEngine, useInterpState } from "./useInterpEngine";

// 통역 화면 자리. 같은 컴포넌트가 area만 바꿔 세 번 놓이고, 상태는 sessionId별 저장소로 공유한다.
export function InterpSlot({ ctx, area }: { ctx: RoomContext; area: InterpSlotArea }) {
  const { store, state } = useInterpState(ctx.sessionId);
  const { say } = useInterpEngine(ctx, store, area === "controls");
  const t = interpText(ctx.role, ctx.uiLang);

  if (area === "remoteCaption") return <RemoteCaptions list={state.remote} t={t} />;
  if (area === "selfCaption") return <SelfCaptions items={state.self} interim={state.interim} t={t} />;
  return (
    <>
      <Controls state={state} store={store} micMuted={ctx.micMuted} demoMode={ctx.demoMode} t={t} />
      {ctx.demoMode && <DemoPhrases role={ctx.role} disabled={!state.enabled} onSay={say} t={t} />}
    </>
  );
}

function RemoteCaptions({ list, t }: { list: CaptionList; t: InterpText }) {
  if (list.items.length === 0) return null;
  return (
    <div className="relative rounded-xl bg-neutral-900/90 px-4 pb-3 pt-6" aria-live="polite">
      <span className="absolute right-3 top-2 rounded bg-sky-800/80 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-sky-100">
        {t.aiBadge}
      </span>
      <ul className="flex flex-col gap-2">
        {list.items.map((c) => (
          <li key={c.id}>
            {c.failed ? (
              <>
                <p className="text-lg leading-snug text-neutral-100">{c.srcText}</p>
                <p className="text-xs text-amber-400">{t.translateFailed}</p>
              </>
            ) : (
              <>
                <p className="text-lg font-medium leading-snug text-neutral-50">{c.dstText}</p>
                <p className="text-xs text-neutral-400">{c.srcText}</p>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SelfCaptions({ items, interim, t }: { items: SelfCaption[]; interim: string; t: InterpText }) {
  if (items.length === 0 && !interim) return null;
  return (
    <div className="rounded-xl bg-neutral-900/80 px-3 py-2 text-sm">
      <p className="mb-1 text-[10px] uppercase tracking-wide text-neutral-500">{t.selfLabel}</p>
      <ul className="flex flex-col gap-1.5">
        {items.map((c) => (
          <li key={c.id}>
            <p className="leading-snug text-neutral-100">{c.srcText}</p>
            {c.pending ? (
              <p className="text-xs text-neutral-500">…</p>
            ) : c.failed ? (
              <p className="text-xs text-amber-400">{t.translateFailed}</p>
            ) : (
              <p className="text-xs text-sky-300">{c.dstText}</p>
            )}
          </li>
        ))}
        {interim && <li className="italic leading-snug text-neutral-500">{interim}</li>}
      </ul>
    </div>
  );
}

function Controls({
  state,
  store,
  micMuted,
  demoMode,
  t,
}: {
  state: InterpState;
  store: InterpStore;
  micMuted: boolean;
  demoMode: boolean;
  t: InterpText;
}) {
  const status = !state.enabled
    ? null
    : state.support === "unsupported"
      ? t.unsupported
      : state.pendingCount > 0
        ? t.translating
        : state.listening && !micMuted
          ? t.listening
          : demoMode && state.talkLocked
            ? t.talkLocked
            : null;
  const canTalk = state.enabled && !micMuted && state.support === "supported" && !state.talkLocked;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Toggle on={state.enabled} label={t.interpToggle} onClick={() => store.set((s) => ({ enabled: !s.enabled }))} />
      <Toggle on={state.voiceOn} label={t.voiceToggle} onClick={() => store.set((s) => ({ voiceOn: !s.voiceOn }))} />
      {demoMode && (
        <button
          type="button"
          aria-pressed={state.talkRequested}
          disabled={!state.talkRequested && !canTalk}
          onClick={() => store.set((s) => ({ talkRequested: !s.talkRequested }))}
          className={`rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-40 ${
            state.talkRequested ? "bg-rose-600 text-white hover:bg-rose-500" : "bg-emerald-600 text-white hover:bg-emerald-500"
          }`}
        >
          {state.talkRequested ? t.talkStop : t.talk}
        </button>
      )}
      {status && (
        <span
          className={`text-sm ${state.support === "unsupported" ? "text-amber-400" : "text-neutral-400"}`}
          role="status"
        >
          {status}
        </span>
      )}
    </div>
  );
}

function Toggle({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium ${
        on ? "bg-sky-700 text-white hover:bg-sky-600" : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
      }`}
    >
      {label}
    </button>
  );
}

// 시연 모드 예시 문장 — 말한 것과 같은 길(번역 → 방송)로 보낸다. 언어는 역할로 고정이라 화면 언어와 무관.
function DemoPhrases({
  role,
  disabled,
  onSay,
  t,
}: {
  role: Role;
  disabled: boolean;
  onSay: (text: string) => void;
  t: InterpText;
}) {
  return (
    <div role="group" aria-label={t.phrasesLabel} className="order-last flex basis-full flex-wrap items-center gap-2">
      <span className="text-xs text-neutral-500">{t.phrasesLabel}</span>
      {config.demo.phrases[role].map((p) => (
        <button
          key={p}
          type="button"
          disabled={disabled}
          onClick={() => onSay(p)}
          className="rounded-full border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-800 disabled:opacity-40"
        >
          {p}
        </button>
      ))}
    </div>
  );
}
