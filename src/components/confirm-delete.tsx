"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ActionState } from "@/lib/actions";

type FormAction = (formData: FormData) => void | Promise<void>;
type Acao = FormAction | ((formData: FormData) => Promise<ActionState>);

export function ConfirmDelete({
  action,
  titulo,
  mensagem,
  verbo = "Excluir",
  modo = "redirect",
  rotuloAria = "Excluir",
}: {
  action: Acao;
  titulo: string;
  mensagem: string;
  verbo?: string;
  modo?: "redirect" | "stay";
  rotuloAria?: string;
}) {
  const [aberto, setAberto] = useState(false);

  async function aoEnviar(e: React.FormEvent<HTMLFormElement>) {
    if (modo === "redirect") return;
    e.preventDefault();
    const form = e.currentTarget;
    const resultado = (await action(new FormData(form))) as ActionState | void;
    if (resultado && !resultado.ok) {
      toast.error(resultado.error);
    } else {
      toast.success("Registro excluído");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex size-9 items-center justify-center rounded-lg border border-transparent text-ink-3 transition-colors hover:border-danger-strong/25 hover:bg-danger-soft hover:text-danger-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        aria-label={rotuloAria}
      >
        <Trash2 className="size-4" />
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={titulo}
          onClick={() => setAberto(false)}
        >
          <div
            className="w-full max-w-sm rounded-[10px] border border-line bg-surface p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-xl text-ink">{titulo}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{mensagem}</p>
            <form
              action={modo === "redirect" ? (action as FormAction) : undefined}
              onSubmit={aoEnviar}
              className="mt-6 flex justify-end gap-2"
            >
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="btn btn-ghost"
              >
                Cancelar
              </button>
              <button type="submit" className="btn btn-danger">
                {verbo}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}