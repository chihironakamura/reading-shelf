"use client";

import { useEffect, useState } from "react";

export function PwaRegister() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [refreshReady, setRefreshReady] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  async function forceRefresh() {
    setIsRefreshing(true);

    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }

      if ("caches" in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      }

      try {
        window.sessionStorage.clear();
      } catch {
        // localStorage is intentionally preserved.
      }
    } finally {
      window.location.reload();
    }
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2 sm:bottom-5">
      {refreshReady && (
        <button
          type="button"
          onClick={() => {
            waitingWorker?.postMessage({ type: "SKIP_WAITING" });
            window.location.reload();
          }}
          className="min-h-11 rounded-full border border-[#2F9FE8]/30 bg-white px-5 text-sm font-black text-[#0E4A7B] shadow-[0_16px_36px_rgba(14,74,123,0.18)] transition hover:bg-[#DDF3FF]"
        >
          最新版に更新
        </button>
      )}
      <button
        type="button"
        onClick={forceRefresh}
        disabled={isRefreshing}
        className="min-h-10 rounded-full border border-[#2F9FE8]/25 bg-white/88 px-4 text-xs font-black text-[#0E4A7B] shadow-[0_12px_28px_rgba(14,74,123,0.14)] backdrop-blur transition hover:bg-[#DDF3FF] disabled:cursor-wait disabled:opacity-75"
      >
        {isRefreshing ? "更新中..." : "最新版に更新"}
      </button>
    </div>
  );
}
