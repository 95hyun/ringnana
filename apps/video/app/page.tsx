// 진입점은 플랫폼이 만드는 /room/{sessionId}?role=... 주소다. 루트는 안내만 한다.
export default function Home() {
  return (
    <main className="flex min-h-full items-center justify-center p-8 text-center">
      <p className="text-sm text-neutral-400">
        Ringnana 화상 진료 — 의원 콘솔 또는 환자 화면에서 입장해 주세요.
      </p>
    </main>
  );
}
