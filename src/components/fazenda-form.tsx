"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/lib/actions";
import { AlertaFormulario, BotaoSubmit, Campo } from "./forms";

export function FazendaForm({
  acao,
  inicial,
}: {
  acao: (prev: ActionState | undefined, formData: FormData) => Promise<ActionState>;
  inicial?: { nome: string; ativa?: boolean };
}) {
  const [state, acaoForm] = useActionState(acao, undefined);
  const [ativa, setAtiva] = useState(inicial?.ativa ?? true);

  return (
    <form action={acaoForm} className="grid gap-5 pb-4">
      <AlertaFormulario mensagem={state && !state.ok ? state.error : undefined} />

      <Campo
        label="Nome da fazenda"
        htmlFor="nome"
        hint="A área total é calculada automaticamente pela soma dos talhões."
      >
        <input
          id="nome"
          name="nome"
          className="field-input"
          defaultValue={inicial?.nome}
          required
          autoFocus
          maxLength={80}
          placeholder="Ex.: Fazenda Boa Vista"
        />
      </Campo>

      <div>
        <p className="field-label">Estado</p>
        <label className="mt-1 flex items-center gap-2 text-sm font-medium text-ink">
          <input
            type="checkbox"
            name="ativa"
            className="size-4 accent-[var(--accent)]"
            checked={ativa}
            onChange={(e) => setAtiva(e.target.checked)}
          />
          Ativa
        </label>
        <p className="mt-1 text-xs text-ink-3">
          Desmarque quando venda/entregue a fazenda: fica archivada (histórico conservado) e suas
          projeções deixan de descontar do caixa.
        </p>
      </div>

      <div className="flex justify-end">
        <BotaoSubmit>{inicial ? "Salvar alterações" : "Cadastrar fazenda"}</BotaoSubmit>
      </div>
    </form>
  );
}