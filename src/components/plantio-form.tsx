"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/lib/actions";
import { TIPOS_PLANTIO_LABEL } from "@/lib/validators";
import { toDateInputValue } from "@/lib/format";
import { AlertaFormulario, BotaoSubmit, Campo } from "./forms";
import { SelectorRegistro } from "./selector-registro";

export type FazendaOpcao = { id: string; nome: string; areaHa: number };
export type TalhaoOpcao = { id: string; nome: string; fazendaId: string };

type Inicial = {
  fazendaId?: string;
  talhaoId?: string;
  safra?: string;
  tipo?: string;
  data?: string;
  valor?: string;
  projecao?: boolean;
  areaHa?: string;
  observacao?: string;
};

export function PlantioForm({
  acao,
  fazendas,
  talhoes,
  safras,
  inicial,
}: {
  acao: (prev: ActionState | undefined, formData: FormData) => Promise<ActionState>;
  fazendas: FazendaOpcao[];
  talhoes: TalhaoOpcao[];
  safras: string[];
  inicial?: Inicial;
}) {
  const [state, action] = useActionState(acao, undefined);
  const [fazendaId, setFazendaId] = useState(inicial?.fazendaId ?? "");
  const [talhaoId, setTalhaoId] = useState(inicial?.talhaoId ?? "");
  const [projecao, setProjecao] = useState(inicial?.projecao ?? false);

  const talhoesFazenda = fazendaId
    ? talhoes.filter((t) => t.fazendaId === fazendaId)
    : [];

  return (
    <form action={action} className="grid gap-5 pb-4">
      <AlertaFormulario mensagem={state && !state.ok ? state.error : undefined} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Fazenda" htmlFor="fazendaId">
          <select
            id="fazendaId"
            name="fazendaId"
            className="field-input"
            required
            value={fazendaId}
            onChange={(e) => {
              setFazendaId(e.target.value);
              setTalhaoId("");
            }}
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

        <Campo
          label="Talhão (opcional)"
          htmlFor="talhaoId"
          hint="O plantio pode ser da fazenda inteira."
        >
          <select
            id="talhaoId"
            name="talhaoId"
            className="field-input"
            value={talhaoId}
            onChange={(e) => setTalhaoId(e.target.value)}
            disabled={!fazendaId}
          >
            <option value="">Fazenda inteira</option>
            {talhoesFazenda.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="Safra" htmlFor="safra" hint="Opcional. Sugere safras usadas antes.">
          <input
            id="safra"
            name="safra"
            className="field-input"
            list="safras-plantio"
            defaultValue={inicial?.safra ?? ""}
            placeholder="Ex.: 2026/27"
            maxLength={30}
          />
          <datalist id="safras-plantio">
            {safras.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Campo>

        <Campo label="Tipo" htmlFor="tipo">
          <select id="tipo" name="tipo" className="field-input" defaultValue={inicial?.tipo ?? "planta"}>
            {Object.entries(TIPOS_PLANTIO_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="Data" htmlFor="data">
          <input
            id="data"
            name="data"
            type="date"
            className="field-input"
            defaultValue={inicial?.data ?? toDateInputValue(new Date())}
          />
        </Campo>

        <Campo label="Valor (R$)" htmlFor="valor" hint="Costo do plantio; não gera receita.">
          <input
            id="valor"
            name="valor"
            className="field-input tnum"
            inputMode="decimal"
            required
            defaultValue={inicial?.valor ?? ""}
            placeholder="0,00"
          />
        </Campo>

        <div className="sm:col-span-2">
          <p className="field-label">Tipo de registro</p>
          <SelectorRegistro valor={projecao} onChange={setProjecao} />
          <input type="hidden" name="projecao" value={projecao ? "on" : ""} />
        </div>

        <Campo
          label="Área (ha, opcional)"
          htmlFor="areaHa"
          hint="Útil para calcular a media de costo por ha dos plantios."
        >
          <input
            id="areaHa"
            name="areaHa"
            className="field-input tnum"
            inputMode="decimal"
            defaultValue={inicial?.areaHa ?? ""}
            placeholder="Ex.: 20"
          />
        </Campo>

        <div className="sm:col-span-2">
          <Campo label="Observações" htmlFor="observacao">
            <textarea
              id="observacao"
              name="observacao"
              className="field-input min-h-20 resize-y"
              maxLength={300}
              defaultValue={inicial?.observacao ?? ""}
              placeholder="Anotações sobre o plantio…"
            />
          </Campo>
        </div>
      </div>

      <div className="flex justify-end">
        <BotaoSubmit>{inicial ? "Salvar alterações" : "Registrar plantio"}</BotaoSubmit>
      </div>
    </form>
  );
}