"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import { criarInvestimento } from "@/lib/actions";
import { fmtMoney, parseDecimal, toDateInputValue } from "@/lib/format";
import { AlertaFormulario, BotaoSubmit, Campo } from "./forms";

export type FazendaOpcao = { id: string; nome: string };

type Linha = { concepto: string; valor: string };

function num(v: string): number {
  const p = parseDecimal(v);
  return Number.isFinite(p) ? p : 0;
}

export function InvestimentoForm({
  fazendas,
  safras,
}: {
  fazendas: FazendaOpcao[];
  safras: string[];
}) {
  const [state, action] = useActionState(criarInvestimento, undefined);
  const [fazendaId, setFazendaId] = useState("");
  const [valor, setValor] = useState("");
  const [calculadora, setCalculadora] = useState(false);
  const [linhas, setLinhas] = useState<Linha[]>([{ concepto: "", valor: "" }]);

  const totalLinhas = linhas.reduce((a, l) => a + num(l.valor), 0);

  function setLinha(idx: number, campo: keyof Linha, v: string) {
    setLinhas(linhas.map((l, k) => (k === idx ? { ...l, [campo]: v } : l)));
  }

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
          label="Nome do investimento"
          htmlFor="nome"
          hint="Ex.: Foliar, Plantio T-03, Adubação projeção…"
        >
          <input
            id="nome"
            name="nome"
            className="field-input"
            required
            maxLength={80}
            placeholder="Ex.: Foliar (projeção)"
          />
        </Campo>

        <Campo label="Valor (R$)" htmlFor="valor" hint="Digite o valor ou use Calcular.">
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

      <div>
        <button
          type="button"
          onClick={() => setCalculadora(!calculadora)}
          className="text-sm font-semibold text-accent hover:text-accent-strong"
        >
          {calculadora ? "Ocultar calculadora" : "+ Calcular custo"}
        </button>
      </div>

      {calculadora && (
        <div className="rounded-[10px] border border-dashed border-line-strong bg-surface/60 p-4">
          <p className="text-xs text-ink-3">
            Sume as operações (trator, adubo, herbicida, mão de obra, semente…) ou multiplique
            valor/ha × área. O total se aplica ao campo Valor.
          </p>
          <div className="mt-3 grid gap-2">
            {linhas.map((l, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  className="field-input min-w-0 flex-1"
                  value={l.concepto}
                  onChange={(e) => setLinha(idx, "concepto", e.target.value)}
                  placeholder="Operación (ex.: Trator)"
                  maxLength={60}
                />
                <input
                  className="field-input tnum w-32"
                  inputMode="decimal"
                  value={l.valor}
                  onChange={(e) => setLinha(idx, "valor", e.target.value)}
                  placeholder="Valor R$"
                />
                <button
                  type="button"
                  onClick={() => setLinhas(linhas.filter((_, k) => k !== idx))}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-ink-3 transition-colors hover:border-danger-strong/25 hover:bg-danger-soft hover:text-danger-strong"
                  aria-label="Quitar línea"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setLinhas([...linhas, { concepto: "", valor: "" }])}
              className="text-sm font-semibold text-accent hover:text-accent-strong"
            >
              + Adicionar línea
            </button>
            <span className="tnum text-sm text-ink-2">
              Total: <span className="font-semibold text-ink">{fmtMoney(totalLinhas)}</span>
            </span>
            <button
              type="button"
              onClick={() => setValor(String(totalLinhas))}
              className="btn btn-soft"
            >
              Usar este total
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <BotaoSubmit>Registrar investimento</BotaoSubmit>
      </div>
    </form>
  );
}