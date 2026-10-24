"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Dict } from "@/dictionaries/jp";
import { acceptRequest, declineRequest, type DecisionResult } from "../actions";

type DecisionDict = Dict["visit"]["clinic"]["decision"];

// 서버 액션 declineRequest의 상한과 같은 값
const REASON_MAX = 200;

// S2 우측 열 맨 위 — 신규 신청(requested)일 때만. 주 버튼 = 수락(primary) 1개, 거절은 outline
export function DecisionPanel({ consultationId, scheduledAt, t }: { consultationId: string; scheduledAt: string; t: DecisionDict }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState<"accept" | "decline" | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState(false);

  const handle = (res: DecisionResult, okToast: string) => {
    if (res.ok) {
      setOpen(null);
      toast.success(okToast);
      return;
    }
    if (res.code === "reasonRequired") {
      setReasonError(true);
      return;
    }
    setOpen(null);
    toast.error(res.detail ? `${t.errors[res.code]} ${res.detail}` : t.errors[res.code]);
    if (res.code === "stale") router.refresh();
  };

  const accept = () => startTransition(async () => handle(await acceptRequest(consultationId), t.acceptedToast));
  const decline = () => {
    if (!reason.trim()) {
      setReasonError(true);
      return;
    }
    startTransition(async () => handle(await declineRequest(consultationId, reason), t.declinedToast));
  };

  return (
    <section className="flex flex-col gap-4 rounded-lg border bg-surface p-5" data-decision-panel>
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold text-primary">{t.eyebrow}</span>
        <h2 className="text-[17px] font-semibold">{t.title}</h2>
        <p className="text-[13px] leading-relaxed text-muted-foreground">{t.body}</p>
      </div>
      <div className="flex flex-col gap-1 border-y py-3">
        <span className="text-[11px] font-semibold text-muted-foreground">{t.scheduledAt}</span>
        <span className="text-[15px] font-medium tabular-nums" data-decision-scheduled>
          {scheduledAt}
        </span>
      </div>
      <Button size="lg" className="h-12 w-full" disabled={pending} data-accept onClick={() => setOpen("accept")}>
        <Check aria-hidden />
        {t.accept}
      </Button>
      <Button variant="outline" size="lg" className="w-full" disabled={pending} data-decline onClick={() => setOpen("decline")}>
        {t.decline}
      </Button>

      <Dialog open={open === "accept"} onOpenChange={(o) => !pending && setOpen(o ? "accept" : null)}>
        <DialogContent data-accept-dialog>
          <DialogHeader>
            <DialogTitle>{t.acceptTitle}</DialogTitle>
            <DialogDescription>{t.acceptPrompt}</DialogDescription>
          </DialogHeader>
          <p className="text-sm font-medium tabular-nums">{scheduledAt}</p>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setOpen(null)}>
              {t.cancel}
            </Button>
            <Button disabled={pending} data-accept-ok onClick={accept}>
              {t.accept}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open === "decline"} onOpenChange={(o) => !pending && setOpen(o ? "decline" : null)}>
        <DialogContent data-decline-dialog>
          <DialogHeader>
            <DialogTitle>{t.declineTitle}</DialogTitle>
            <DialogDescription>{t.declinePrompt}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="decline-reason" className="text-[13px] font-semibold">
              {t.reasonLabel}
            </Label>
            <Textarea
              id="decline-reason"
              value={reason}
              maxLength={REASON_MAX}
              rows={3}
              placeholder={t.reasonPlaceholder}
              aria-invalid={reasonError || undefined}
              data-decline-reason
              onChange={(e) => {
                setReason(e.target.value);
                if (e.target.value.trim()) setReasonError(false);
              }}
            />
            <div className="flex justify-between text-xs">
              {/* 입력 누락 안내는 경고 톤(빨강은 응급 안내 전용, docs/design.md) */}
              <span className="text-warning-foreground">{reasonError ? t.errors.reasonRequired : ""}</span>
              <span className="text-muted-foreground tabular-nums">
                {reason.length}/{REASON_MAX}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setOpen(null)}>
              {t.cancel}
            </Button>
            <Button disabled={pending || !reason.trim()} data-decline-ok onClick={decline}>
              {t.decline}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
