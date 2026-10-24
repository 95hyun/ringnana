import type { ReactNode } from "react";
import { messages } from "@/video/messages";

export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md space-y-4 text-center text-base leading-relaxed text-neutral-200">{children}</div>
    </div>
  );
}

// 역할을 알 수 없으므로 환자용 일본어와 의사용 한국어를 함께 보인다 (spec §3)
export function InvalidLink() {
  return (
    <main className="flex h-dvh flex-col">
      <Notice>
        <p>{messages.ja.common.invalidLink}</p>
        <p className="text-sm text-neutral-400">입장 주소가 올바르지 않습니다. 의원 콘솔에서 다시 입장해 주세요.</p>
      </Notice>
    </main>
  );
}
