"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/actions";
import { AlertaFormulario, BotaoSubmit, Campo } from "./forms";

export function FazendaForm({
  acao,
  inicial,
}: {
  acao: (prev: ActionState | undefined, formData: FormData) => Promise<ActionState>;
  inicial?: { nome: string; cidade: string; uf: string; area: number };
}) {
  const [state, acaoForm] = useActionState(acao, undefined);

  return (
    <form action={acaoForm} className="grid gap-5 pb-4">
      <AlertaFormulario mensagem={state && !state.ok ? state.error : undefined} />

      <Campo label="Nome da fazenda" htmlFor="nome">
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

      <div className="grid grid-cols-[1fr_5.5rem] gap-4">
        <Campo label="Cidade" htmlFor="cidade">
          <input
            id="cidade"
            name="cidade"
            className="field-input"
            defaultValue={inicial?.cidade}
            maxLength={60}
            placeholder="Ex.: Morro Agudo"
          />
        </Campo>
        <Campo label="UF" htmlFor="uf">
          <input
            id="uf"
            name="uf"
            className="field-input uppercase"
            defaultValue={inicial?.uf}
            maxLength={2}
            placeholder="SP"
          />
        </Campo>
      </div>

      <Campo
        label="Área total (ha)"
        htmlFor="area"
        hint="Hectares. Aceita vírgula como decimal."
      >
        <input
          id="area"
          name="area"
          className="field-input tnum"
          defaultValue={inicial ? String(inicial.area).replace(".", ",") : undefined}
          inputMode="decimal"
          required
          placeholder="Ex.: 320,5"
        />
      </Campo>

      <div className="flex justify-end">
        <BotaoSubmit>{inicial ? "Salvar alterações" : "Cadastrar fazenda"}</BotaoSubmit>
      </div>
    </form>
  );
}