"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/actions";
import { MODELOS_USINA, MODELO_USINA_LABEL, type ModeloUsina } from "@/lib/colheita";
import { AlertaFormulario, BotaoSubmit, Campo } from "./forms";

export function UsinaForm({
  acao,
  inicial,
}: {
  acao: (prev: ActionState | undefined, formData: FormData) => Promise<ActionState>;
  inicial?: { nome: string; modelo: string };
}) {
  const [state, acaoForm] = useActionState(acao, undefined);

  return (
    <form action={acaoForm} className="grid gap-5 pb-4">
      <AlertaFormulario mensagem={state && !state.ok ? state.error : undefined} />

      <Campo
        label="Nome da usina"
        htmlFor="nome"
        hint="Ex.: Usina Pindorama, Usina Coruripe…"
      >
        <input
          id="nome"
          name="nome"
          className="field-input"
          defaultValue={inicial?.nome}
          required
          autoFocus
          maxLength={80}
          placeholder="Ex.: Usina Coruripe"
        />
      </Campo>

      <Campo
        label="Modelo de remuneração"
        htmlFor="modelo"
        hint="Define como o valor da colheita é calculado."
      >
        <select
          id="modelo"
          name="modelo"
          className="field-input"
          defaultValue={inicial?.modelo ?? "pindorama"}
          required
        >
          {MODELOS_USINA.map((m: ModeloUsina) => (
            <option key={m} value={m}>
              {MODELO_USINA_LABEL[m]}
            </option>
          ))}
        </select>
      </Campo>

      <div className="flex justify-end">
        <BotaoSubmit>{inicial ? "Salvar alterações" : "Cadastrar usina"}</BotaoSubmit>
      </div>
    </form>
  );
}