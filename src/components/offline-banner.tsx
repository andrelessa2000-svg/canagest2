"use client";

import { useOffline } from "next/offline";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const isOffline = useOffline();

  if (!isOffline) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 border-b border-danger-strong/30 bg-danger-soft px-4 py-1.5 text-center text-xs font-medium text-danger-strong"
    >
      <WifiOff className="size-3.5 shrink-0" />
      Modo offline — os registros pendentes serão enviados quando a conexão voltar.
    </div>
  );
}