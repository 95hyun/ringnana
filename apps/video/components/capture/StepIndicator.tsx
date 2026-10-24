import type { PhotoAngle } from "@/lib/contracts";
import { CAPTURE_ORDER } from "@/lib/capture-flow";
import type { capture as CaptureText } from "@/messages/ja/capture";
import type { Messages } from "@/messages/types";

const NUM = ["①", "②", "③"];

export function StepIndicator({
  step,
  doneAngles,
  t,
}: {
  step: PhotoAngle | null;
  doneAngles: PhotoAngle[];
  t: Messages<typeof CaptureText>;
}) {
  return (
    <ol className="flex items-center gap-2">
      {CAPTURE_ORDER.map((a, i) => {
        const done = doneAngles.includes(a);
        const current = a === step;
        return (
          <li
            key={a}
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold transition-colors sm:text-base ${
              current
                ? "bg-white text-neutral-900 ring-2 ring-sky-400"
                : done
                  ? "bg-emerald-500 text-white"
                  : "bg-black/50 text-neutral-300"
            }`}
          >
            <span>{NUM[i]}</span>
            <span>{t.steps[a]}</span>
            {done && <span aria-label="done">✔</span>}
          </li>
        );
      })}
    </ol>
  );
}
