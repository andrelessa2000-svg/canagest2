"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2, Calculator, Target } from "lucide-react";
import { fmtMoney, fmtCount, parseDecimal, TAREFAS_POR_HA } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { CelulaMetrica } from "@/components/stat-cells";
import { Campo } from "@/components/forms";

type Cenario = {
  id: string;
  nome: string;
  areaHa: string;
  custoTarefa: string;
  custoHa: string;
  tPorHa: string;
  precoCana: string;
};

function num(v: string): number {
  const p = parseDecimal(v);
  return Number.isFinite(p) ? p : 0;
}

const cenarioVazio: Cenario = {
  id: "",
  nome: "",
  areaHa: "",
  custoTarefa: "",
  custoHa: "",
  tPorHa: "",
  precoCana: "",
};

export default function SimuladorPage() {
  const [cenarios, setCenarios] = useState<Cenario[]>([]);
  const [draft, setDraft] = useState<Cenario>({ ...cenarioVazio, id: crypto.randomUUID() });

  const recalcular = () => {
    const custoHa = num(draft.custoTarefa) * TAREFAS_POR_HA;
    const custoTarefa = num(draft.custoHa) / TAREFAS_POR_HA;
    if (draft.custoTarefa && !draft.custoHa) {
      setDraft({ ...draft, custoHa: custoHa.toFixed(2) });
    } else if (draft.custoHa && !draft.custoTarefa) {
      setDraft({ ...draft, custoTarefa: custoTarefa.toFixed(2) });
    }
  };

  const adicionar = () => {
    if (!draft.nome.trim() || !draft.areaHa || !draft.tPorHa || !draft.precoCana) return;
    if (!draft.custoTarefa && !draft.custoHa) return;
    setCenarios([...cenarios, { ...draft }]);
    setDraft({ ...cenarioVazio, id: crypto.randomUUID() });
  };

  const remover = (id: string) => setCenarios(cenarios.filter((c) => c.id !== id));

  const resultados = useMemo(() => {
    return cenarios.map((c) => {
      const area = num(c.areaHa);
      const custoT = num(c.custoTarefa) || num(c.custoHa) / TAREFAS_POR_HA;
      const custoH = num(c.custoHa) || num(c.custoTarefa) * TAREFAS_POR_HA;
      const tHa = num(c.tPorHa);
      const preco = num(c.precoCana);
      const toneladas = area * tHa;
      const custoTotal = area * custoH;
      const receita = toneladas * preco;
      const lucro = receita - custoTotal;
      const roi = custoTotal > 0 ? (lucro / custoTotal) * 100 : 0;
      const lucroPorHa = area > 0 ? lucro / area : 0;
      return {
        ...c,
        area,
        custoTarefa: custoT,
        custoHa: custoH,
        tHa,
        preco,
        toneladas,
        custoTotal,
        receita,
        lucro,
        roi,
        lucroPorHa,
      };
    });
  }, [cenarios]);

  const totalArea = resultados.reduce((s, r) => s + r.area, 0);
  const totalToneladas = resultados.reduce((s, r) => s + r.toneladas, 0);
  const totalCusto = resultados.reduce((s, r) => s + r.custoTotal, 0);
  const totalReceita = resultados.reduce((s, r) => s + r.receita, 0);
  const totalLucro = resultados.reduce((s, r) => s + r.lucro, 0);
  const totalRoi = totalCusto > 0 ? (totalLucro / totalCusto) * 100 : 0;

  return (
    <div className="mx-auto max-w-6xl grid gap-6 pb-8 px-4">
      <PageHeader
        rotulo="ferramentas"
        titulo="Simulador de decisão"
        descricao="Informe custo por tarefa/ha, produtividade esperada (t/ha) e preço da cana. O simulador projeta toneladas, receita, lucro e ROI por cenário e no total."
      />

      <section className="rounded-[10px] border border-line bg-surface p-5 sm:p-6">
        <h2 className="font-display text-lg text-ink mb-4 flex items-center gap-2">
          <Calculator className="size-5 text-accent" /> Novo cenário
        </h2>
        <div className="grid gap-4 sm:grid-cols-[1fr_120px_140px_140px_120px_140px_auto] items-end">
          <Campo label="Nome do cenário" htmlFor="sim-nome">
            <input
              id="sim-nome"
              className="field-input"
              value={draft.nome}
              onChange={(e) => setDraft({ ...draft, nome: e.target.value })}
              placeholder="Ex.: Reforma talhão 12"
            />
          </Campo>
          <Campo label="Área (ha)" htmlFor="sim-area">
            <input
              id="sim-area"
              className="field-input tnum"
              inputMode="decimal"
              value={draft.areaHa}
              onChange={(e) => setDraft({ ...draft, areaHa: e.target.value })}
              placeholder="20"
            />
          </Campo>
          <Campo label="Custo/tarefa (R$)" htmlFor="sim-ct" hint="Ou preencha custo/ha">
            <input
              id="sim-ct"
              className="field-input tnum"
              inputMode="decimal"
              value={draft.custoTarefa}
              onChange={(e) => { setDraft({ ...draft, custoTarefa: e.target.value }); recalcular(); }}
              placeholder="500"
            />
          </Campo>
          <Campo label="Custo/ha (R$)" htmlFor="sim-ch" hint="Ou preencha custo/tarefa">
            <input
              id="sim-ch"
              className="field-input tnum"
              inputMode="decimal"
              value={draft.custoHa}
              onChange={(e) => { setDraft({ ...draft, custoHa: e.target.value }); recalcular(); }}
              placeholder="1652,90"
            />
          </Campo>
          <Campo label="Produtividade (t/ha)" htmlFor="sim-tph">
            <input
              id="sim-tph"
              className="field-input tnum"
              inputMode="decimal"
              value={draft.tPorHa}
              onChange={(e) => setDraft({ ...draft, tPorHa: e.target.value })}
              placeholder="85"
            />
          </Campo>
          <Campo label="Preço cana (R$/t)" htmlFor="sim-pc">
            <input
              id="sim-pc"
              className="field-input tnum"
              inputMode="decimal"
              value={draft.precoCana}
              onChange={(e) => setDraft({ ...draft, precoCana: e.target.value })}
              placeholder="164"
            />
          </Campo>
          <button type="button" onClick={adicionar} className="btn btn-primary h-10" disabled={!draft.nome.trim() || !draft.areaHa || !draft.tPorHa || !draft.precoCana || (!draft.custoTarefa && !draft.custoHa)}>
            <Plus className="size-4" /> Adicionar
          </button>
        </div>
      </section>

      {resultados.length > 0 && (
        <>
          <section className="grid gap-3">
            <h2 className="font-display text-lg text-ink">Resultados por cenário</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-ink-3">
                    <th className="pb-2 pr-4">Cenário</th>
                    <th className="pb-2 pr-4 tnum">Área (ha)</th>
                    <th className="pb-2 pr-4 tnum">Custo/tarefa</th>
                    <th className="pb-2 pr-4 tnum">Custo/ha</th>
                    <th className="pb-2 pr-4 tnum">t/ha</th>
                    <th className="pb-2 pr-4 tnum">Preço/t</th>
                    <th className="pb-2 pr-4 tnum">Toneladas</th>
                    <th className="pb-2 pr-4 tnum">Custo total</th>
                    <th className="pb-2 pr-4 tnum">Receita</th>
                    <th className="pb-2 pr-4 tnum">Lucro</th>
                    <th className="pb-2 pr-4 tnum">ROI</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.map((r) => (
                    <tr key={r.id} className="border-b border-line/50 hover:bg-surface-muted/50">
                      <td className="py-2 pr-4 font-medium text-ink">{r.nome}</td>
                      <td className="py-2 pr-4 tnum">{fmtCount(r.area)}</td>
                      <td className="py-2 pr-4 tnum">{fmtMoney(r.custoTarefa)}</td>
                      <td className="py-2 pr-4 tnum">{fmtMoney(r.custoHa)}</td>
                      <td className="py-2 pr-4 tnum">{r.tHa.toFixed(1).replace(".", ",")}</td>
                      <td className="py-2 pr-4 tnum">{fmtMoney(r.preco)}</td>
                      <td className="py-2 pr-4 tnum font-medium">{fmtCount(r.toneladas)}</td>
                      <td className="py-2 pr-4 tnum">{fmtMoney(r.custoTotal)}</td>
                      <td className="py-2 pr-4 tnum">{fmtMoney(r.receita)}</td>
                      <td className="py-2 pr-4 tnum">{fmtMoney(r.lucro)}</td>
                      <td className="py-2 pr-4 tnum">{r.roi.toFixed(1).replace(".", ",")}%</td>
                      <td className="py-2">
                        <button
                          type="button"
                          onClick={() => remover(r.id)}
                          className="inline-flex size-8 items-center justify-center rounded-lg border border-line text-ink-3 transition-colors hover:border-danger-strong hover:text-danger-strong"
                          aria-label={`Remover ${r.nome}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-[10px] border border-accent bg-accent-soft/30 p-5">
            <h3 className="font-display text-lg text-accent-strong mb-3 flex items-center gap-2">
              <Target className="size-5" /> Resumo consolidado
            </h3>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-line bg-line sm:grid-cols-6">
              <CelulaMetrica rotulo="Área total" valor={fmtCount(totalArea)} legenda="ha" />
              <CelulaMetrica rotulo="Toneladas" valor={fmtCount(totalToneladas)} legenda="t" />
              <CelulaMetrica rotulo="Custo total" valor={fmtMoney(totalCusto)} />
              <CelulaMetrica rotulo="Receita" valor={fmtMoney(totalReceita)} />
              <CelulaMetrica rotulo="Lucro" valor={fmtMoney(totalLucro)} destaque />
              <CelulaMetrica rotulo="ROI" valor={`${totalRoi.toFixed(1).replace(".", ",")}%`} destaque />
            </div>

            {resultados.length > 1 && (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {resultados
                  .sort((a, b) => b.lucroPorHa - a.lucroPorHa)
                  .slice(0, 3)
                  .map((r, i) => (
                    <div key={r.id} className="rounded-lg border border-line bg-surface p-3">
                      <p className="text-xs text-ink-3">#{i + 1} melhor lucro/ha</p>
                      <p className="font-semibold text-ink">{r.nome}</p>
                      <p className="tnum text-sm font-bold text-accent">{fmtMoney(r.lucroPorHa)}/ha</p>
                      <p className="tnum text-xs text-ink-2">ROI {r.roi.toFixed(1).replace(".", ",")}% · {fmtCount(r.toneladas)} t</p>
                    </div>
                  ))}
              </div>
            )}
          </section>
        </>
      )}

      {cenarios.length === 0 && (
        <section className="rounded-[10px] border border-dashed border-line-strong bg-surface/60 p-8 text-center">
          <Calculator className="size-12 text-ink-3 mx-auto mb-3" />
          <h3 className="font-display text-lg text-ink mb-1">Nenhum cenário adicionado</h3>
          <p className="text-ink-2 max-w-md mx-auto">
            Preencha os campos acima e clique em <strong>Adicionar</strong> para criar seu primeiro cenário.
            Você pode comparar vários cenários lado a lado.
          </p>
        </section>
      )}
    </div>
  );
}