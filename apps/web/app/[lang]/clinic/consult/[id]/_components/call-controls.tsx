"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import type { H3Dict } from "../../../_components/labels";
import { endCall, startCall } from "../actions";

type CallDict = H3Dict["clinic"]["call"];

type Props = {
  consultationId: string;
  status: string;
  doctorUrl: string | null;
  t: CallDict;
};

export function CallControls({ consultationId, status, doctorUrl, t }: Props) {
  const [pending, startTransition] = useTransition();
  // 서버 액션 실패가 에러 바운더리로 번져 데모 화면이 날아가지 않게 토스트로만 알린다
  const run = (fn: () => Promise<unknown>) =>
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        toast.error(`${t.changeFailed} ${e instanceof Error ? e.message : String(e)}`);
      }
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!doctorUrl ? (
        <p className="text-sm text-destructive" data-video-missing>
          {t.missingVideo}
        </p>
      ) : status !== "done" ? (
        // 링크 이동은 동기로 새 탭을 열고(팝업 차단 회피) 상태 변경은 병행한다
        <a
          href={doctorUrl}
          target="_blank"
          rel="noopener"
          data-start-call
          className={buttonVariants({ size: "lg" })}
          onClick={() => run(() => startCall(consultationId))}
        >
          {status === "in_call" ? t.reopen : t.start}
        </a>
      ) : null}
      {status === "in_call" ? (
        <Button
          variant="destructive"
          size="lg"
          disabled={pending}
          data-end-call
          onClick={() => run(() => endCall(consultationId))}
        >
          {t.end}
        </Button>
      ) : null}
    </div>
  );
}

// video 앱이 returnUrl(?ended=1)로 돌려보내면 종료 처리 후 쿼리를 지운다 — 계약 §2 (A)
export function EndOnReturn({ consultationId, t }: { consultationId: string; t: CallDict }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const done = useRef(false);
  const ended = params.get("ended") === "1";

  useEffect(() => {
    if (!ended || done.current) return;
    done.current = true;
    endCall(consultationId)
      .then((changed) => {
        if (changed) toast.success(t.endedToast);
      })
      .catch((e) => toast.error(`${t.endFailed} ${e instanceof Error ? e.message : e}`))
      .finally(() => router.replace(pathname));
  }, [ended, consultationId, router, pathname, t]);

  return null;
}
