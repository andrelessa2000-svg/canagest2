"use client";

import { useActionState, useState } from "react";
import { criarInvestimento } from "@/lib/actions";
import { toDateInputValue } from "@/lib/format";
import { AlertaFormulario, BotaoSubmit, Campo } from "./forms";

export type FazendaOpcao = { id: string; nome: string };

export function InvestimentoForm({
  fazendas,
  safras,
}: {
  fazendas: FazendaOpcao[];
  safras: string[];
}) {
  const [state, action] = useActionState(criarInvestimento, undefined);
  const [fazendaId, setFazendaId] = useState("");

  return (
    <form action={action} className="grid gap-4">
      <AlertaFormulario mensagem={state && !state.ok ? state.error : undefined} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Fazenda" htmlFor="fazendaId">
          <select
            id="fazendaId"
            name="fazendaId"
            className="field-input"
            required
            value={fazendaId}
            onChange={(e) => setFazendaId(e.target.value)}
          >
            <option value="" disabled>
              Selecione…
            </option>
            {fazendas.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="Safra" htmlFor="safra" hint="Opcional.">
          <input
            id="safra"
            name="safra"
            className="field-input"
            list="safras-financeiro"
            placeholder="Ex.: 2026/27"
            maxLength={30}
          />
          <datalist id="safras-financeiro">
            {safras.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Campo>

        <Campo
          label="Nome da inversão"
          htmlFor="nome"
          hint="Ex.: Plantio T-03, Adubação projeção, Herbicida…"
        >
          <input
            id="nome"
            name="nome"
            className="field-input"
            required
            maxLength={80}
            placeholder="Ex.: Plantio T-03"
          />
        </Campo>

        <Campo label="Valor (R$)" htmlFor="valor" hint="Custo previsto até a próxima safra.">
          <input
            id="valor"
            name="valor"
            className="field-input tnum"
            inputMode="decimal"
            required
            placeholder="0,00"
          />
        </Campo>

        <Campo label="Data prevista" htmlFor="data">
          <input
            id="data"
            name="data"
            type="date"
            className="field-input"
            defaultValue={toDateInputValue(new Date())}
          />
        </Campo>

        <Campo label="Observações" htmlFor="observacao">
          <input
            id="observacao"
            name="observacao"
            className="field-input"
            maxLength={300}
            placeholder="Opcional"
          />
        </Campo>
      </div>
      <div className="flex justify-end">
        <BotaoSubmit>Registrar inversão</BotaoSubmit>
      </div>
    </form>
  );
}