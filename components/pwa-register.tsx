"use client";

import { useEffect, useState } from "react";

export function PwaRegister() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [refreshReady, setRefreshReady] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    let refreshing = false;

    const handleControllerChange = () => {
      if (refreshing) {
        return;
      }

      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        registration.update().catch(() => undefined);

        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setRefreshReady(true);
        }

        registration.addEventListener("updatefound", () => {
          const nextWorker = registration.installing;

          if (!nextWorker) {
            return;
          }

          nextWorker.addEventListener("statechange", () => {
            if (nextWorker.state === "installed" && navigator.serviceWorker.controller) {
              setWaitingWorker(nextWorker);
              setRefreshReady(true);
            }
          });
        });
      })
      .catch((error) => {
        console.error("Service worker registration failed", error);
      });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  if (!refreshReady) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => {
        waitingWorker?.postMessage({ type: "SKIP_WAITING" });
        window.location.reload();
      }}
      className="fixed bottom-4 left-1/2 z-50 min-h-11 -translate-x-1/2 rounded-full border border-[#2F9FE8]/30 bg-white px-5 text-sm font-black text-[#0E4A7B] shadow-[0_16px_36px_rgba(14,74,123,0.18)] transition hover:bg-[#DDF3FF]"
    >
      最新版に更新
    </button>
  );
}
