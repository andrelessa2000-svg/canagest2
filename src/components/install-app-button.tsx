"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

type PromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppButton() {
  const [deferred, setDeferred] = useState<PromptEvent | null>(null);
  const [standalone, setStandalone] = useState(() =>
    typeof window !== "undefined" &&
    window.matchMedia("(display-mode: standalone)").matches
  );
  const [isIos] = useState(() =>
    typeof navigator !== "undefined"
      ? /iPad|iPhone|iPod/.test(navigator.userAgent)
      : false
  );
  const [hint, setHint] = useState(false);

  useEffect(() => {
    function onPrompt(e: Event) {
      e.preventDefault();
      setDeferred(e as PromptEvent);
      setHint(false);
    }
    function onAppInstalled() {
      setDeferred(null);
      setStandalone(true);
    }
    function onMedia(m: MediaQueryListEvent) {
      setStandalone(m.matches);
    }
    const media = window.matchMedia("(display-mode: standalone)");
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    media.addEventListener("change", onMedia);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      media.removeEventListener("change", onMedia);
    };
  }, []);

  if (standalone) return null;

  async function install() {
    if (deferred) {
      await deferred.prompt();
      setDeferred(null);
      return;
    }
    if (isIos) {
      setHint(true);
    }
  }

  return (
    <div className="relative flex flex-col items-end">
      <button
        type="button"
        onClick={install}
        className="btn btn-ghost !px-3 !py-2 text-[0.8rem]"
        aria-label="Instalar aplicativo no dispositivo"
      >
        <Download className="size-4" />
        <span className="hidden sm:inline">Instalar</span>
      </button>
      {hint && isIos && (
        <p className="absolute top-full right-0 z-30 mt-2 w-56 rounded-lg border border-line bg-surface p-3 text-xs leading-relaxed text-ink-2 shadow-lg">
          No iPhone/iPad: toque em{" "}
          <span className="font-semibold text-ink">Compartilhar</span> e depois em{" "}
          <span className="font-semibold text-ink">Adicionar à Tela de Início</span>.
        </p>
      )}
    </div>
  );
}