"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Wrench } from "lucide-react";
import { toast } from "sonner";
import { corrigirSafrasAntigas } from "@/lib/actions";

export function BotaoCorrigirSafras() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [ocupado, iniciar] = useTransition();

  function executar() {
    iniciar(async () => {
      const r = await corrigirSafrasAntigas();
      if (r.ok) {
        toast.success(r.mensagem ?? "Safras corrigidas.");
        setAberto(false);
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="btn btn-ghost text-xs"
        title="Corrigir safras antigas gravadas fora do formato AAAA/AA"
      >
        <Wrench className="size-3.5" /> Corrigir safras antigas
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-line bg-surface-muted px-3 py-2 text-xs text-ink-2">
      <span>
        Isso ajusta safras como <strong>2025/2026</strong> ou <strong>25/26</strong> para{" "}
        <strong>2025/26</strong>. Nenhum valor é apagado.
      </span>
      <button
        type="button"
        onClick={executar}
        disabled={ocupado}
        className="btn btn-secondary"
      >
        {ocupado ? "Corrigindo…" : "Corrigir agora"}
      </button>
      <button
        type="button"
        onClick={() => setAberto(false)}
        disabled={ocupado}
        className="btn btn-ghost"
      >
        Cancelar
      </button>
    </div>
  );
}
