"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/lib/actions";
import { ESCOPOS_TRATO_LABEL, TIPOS_PLANTIO_LABEL } from "@/lib/validators";
import { toDateInputValue } from "@/lib/format";
import { AlertaFormulario, BotaoSubmit, Campo } from "./forms";
import { SelectorRegistro } from "./selector-registro";

export type FazendaOpcao = { id: string; nome: string; areaHa: number };
export type TalhaoOpcao = { id: string; nome: string; fazendaId: string; areaHa: number };

type Inicial = {
  fazendaId?: string;
  talhaoId?: string;
  talhoesIds?: string[];
  escopo?: string;
  tarefas?: string;
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
  const [escopo, setEscopo] = useState(inicial?.escopo ?? "fazenda");
  const [talhoesSel, setTalhoesSel] = useState<string[]>(inicial?.talhoesIds ?? []);
  const [projecao, setProjecao] = useState(inicial?.projecao ?? false);

  const talhoesFazenda = fazendaId
    ? talhoes.filter((t) => t.fazendaId === fazendaId)
    : [];
  const fazendaAtual = fazendas.find((f) => f.id === fazendaId);

  function toggleTalhao(id: string) {
    setTalhoesSel(
      talhoesSel.includes(id)
        ? talhoesSel.filter((x) => x !== id)
        : [...talhoesSel, id],
    );
  }

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
              setTalhoesSel([]);
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
          label="Escopo"
          htmlFor="escopo"
          hint="Fazenda inteira, talhões específicos ou parte de um talhão."
        >
          <select
            id="escopo"
            name="escopo"
            className="field-input"
            value={escopo}
            onChange={(e) => setEscopo(e.target.value)}
          >
            {Object.entries(ESCOPOS_TRATO_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      {escopo === "talhao" && (
        <div className="rounded-[10px] border border-dashed border-line-strong bg-surface/60 p-4">
          <p className="text-xs text-ink-3">
            Marque os talhões onde foi/será feito o plantio:
          </p>
          {talhoesFazenda.length === 0 ? (
            <p className="mt-2 text-sm text-ink-2">Selecione primeiro a fazenda.</p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {talhoesFazenda.map((t) => (
                <label
                  key={t.id}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm transition-colors ${
                    talhoesSel.includes(t.id)
                      ? "border-accent bg-accent-soft text-ink"
                      : "border-line bg-surface text-ink-2"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--accent)]"
                    checked={talhoesSel.includes(t.id)}
                    onChange={() => toggleTalhao(t.id)}
                  />
                  {t.nome}
                  <span className="text-xs text-ink-3">
                    {Math.round(t.areaHa * 3.3)} tarefas
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {escopo === "parte" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Talhão" htmlFor="talhaoId">
            <select
              id="talhaoId"
              name="talhaoId"
              className="field-input"
              value={talhoesSel[0] ?? ""}
              onChange={(e) => setTalhoesSel([e.target.value])}
              disabled={!fazendaId}
            >
              <option value="" disabled>
                Selecione…
              </option>
              {talhoesFazenda.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Tarefas" htmlFor="tarefas" hint="Porção do talhão onde se planta.">
            <input
              id="tarefas"
              name="tarefas"
              className="field-input tnum"
              inputMode="decimal"
              defaultValue={inicial?.tarefas ?? ""}
              required
            />
          </Campo>
        </div>
      )}

      <input type="hidden" name="talhoesIds" value={JSON.stringify(talhoesSel)} />
      {escopo === "fazenda" && fazendaAtual && (
        <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-ink-2">
          {fazendaAtual.nome} · {Math.round(fazendaAtual.areaHa * 3.3)} tarefas
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
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

        <Campo
          label="Área (ha, opcional)"
          htmlFor="areaHa"
          hint="Útil para calcular a média de custo por ha dos plantios."
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
          <p className="field-label">Tipo de registro</p>
          <SelectorRegistro valor={projecao} onChange={setProjecao} />
          <input type="hidden" name="projecao" value={projecao ? "on" : ""} />
        </div>

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