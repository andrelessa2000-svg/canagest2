"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/lib/actions";
import { TIPOS_PLANTIO_LABEL } from "@/lib/validators";
import { fmtMoney, parseDecimal, toDateInputValue } from "@/lib/format";
import { AlertaFormulario, BotaoSubmit, Campo } from "./forms";

export type FazendaOpcao = { id: string; nome: string; areaHa: number };
export type TalhaoOpcao = { id: string; nome: string; fazendaId: string };

function num(v: string): number {
  const p = parseDecimal(v);
  return Number.isFinite(p) ? p : 0;
}

type Inicial = {
  fazendaId?: string;
  talhaoId?: string;
  safra?: string;
  tipo?: string;
  data?: string;
  valor?: string;
  projecao?: boolean;
  areaHa?: string;
  valorPorHa?: string;
  observacao?: string;
};

export function PlantioForm({
  acao,
  fazendas,
  talhoes,
  safras,
  mediaPorHa,
  inicial,
}: {
  acao: (prev: ActionState | undefined, formData: FormData) => Promise<ActionState>;
  fazendas: FazendaOpcao[];
  talhoes: TalhaoOpcao[];
  safras: string[];
  mediaPorHa?: number | null;
  inicial?: Inicial;
}) {
  const [state, action] = useActionState(acao, undefined);
  const [fazendaId, setFazendaId] = useState(inicial?.fazendaId ?? "");
  const [talhaoId, setTalhaoId] = useState(inicial?.talhaoId ?? "");
  const [projecao, setProjecao] = useState(inicial?.projecao ?? false);
  const [areaHa, setAreaHa] = useState(inicial?.areaHa ?? "");
  const [valorPorHa, setValorPorHa] = useState(inicial?.valorPorHa ?? "");
  const [valor, setValor] = useState(inicial?.valor ?? "");

  const totalProjeccion =
    projecao && num(areaHa) > 0 && num(valorPorHa) > 0 ? num(areaHa) * num(valorPorHa) : 0;

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

        <label className="flex items-center gap-2 text-sm font-medium text-ink">
          <input
            type="checkbox"
            name="projecao"
            className="size-4 accent-[var(--accent)]"
            checked={projecao}
            onChange={(e) => setProjecao(e.target.checked)}
          />
          É uma projeção (custo futuro)
        </label>
      </div>

      {projecao && (
        <div className="rounded-[10px] border border-dashed border-line-strong bg-surface/60 p-4">
          <p className="text-xs text-ink-3">
            Use a média por ha dos plantios anteriores (
            {mediaPorHa ? `${fmtMoney(mediaPorHa)}/ha` : "ainda sem média"}) ou calcule com operações
            (trator, adubo, herbicida, mão de obra, semente) e preencha o valor total.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <Campo label="Valor por ha (media)" htmlFor="valorPorHa">
              <input
                id="valorPorHa"
                className="field-input tnum"
                inputMode="decimal"
                value={valorPorHa}
                onChange={(e) => {
                  setValorPorHa(e.target.value);
                  if (num(areaHa) > 0) setValor(String(num(areaHa) * num(e.target.value)));
                }}
                placeholder="Ex.: 12.000"
              />
            </Campo>
            <Campo label="Área a plantar (ha)" htmlFor="areaHa">
              <input
                id="areaHa"
                className="field-input tnum"
                inputMode="decimal"
                value={areaHa}
                onChange={(e) => {
                  setAreaHa(e.target.value);
                  if (num(valorPorHa) > 0) setValor(String(num(e.target.value) * num(valorPorHa)));
                }}
                placeholder="Ex.: 20"
              />
            </Campo>
            <div className="flex items-end">
              <p className="w-full rounded-lg bg-surface-muted px-3 py-2.5 text-sm text-ink-2">
                Total: <span className="tnum font-semibold text-ink">{fmtMoney(totalProjeccion)}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      <Campo
        label="Valor (R$)"
        htmlFor="valor"
        hint={projecao ? "Custo previsto do plantio; não gera receita." : "Custo do plantio; não gera receita."}
      >
        <input
          id="valor"
          name="valor"
          className="field-input tnum"
          inputMode="decimal"
          required
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="0,00"
        />
      </Campo>

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

      <div className="flex justify-end">
        <BotaoSubmit>{inicial ? "Salvar alterações" : "Registrar plantio"}</BotaoSubmit>
      </div>
    </form>
  );
}