"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Plus, Trash2, Calculator, Target, Sparkles } from "lucide-react";
import { fmtMoney, fmtCount, parseDecimal, TAREFAS_POR_HA } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { CelulaMetrica } from "@/components/stat-cells";
import { Campo } from "@/components/forms";
import { simularCenarios, type CenarioSimulacao, type MediasHistoricas } from "@/lib/simulador";

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
  const [medias, setMedias] = useState<MediasHistoricas | null>(null);
  const [usarMedias, setUsarMedias] = useState(false);

  const preencherComMedias = useCallback((m: MediasHistoricas) => {
    if (m.custoTotalPorTarefa > 0 && !draft.custoTarefa && !draft.custoHa) {
      setDraft((d) => ({ ...d, custoTarefa: m.custoTotalPorTarefa.toFixed(2) }));
    }
    if (m.produtividadeMedia > 0 && !draft.tPorHa) {
      setDraft((d) => ({ ...d, tPorHa: m.produtividadeMedia.toFixed(1) }));
    }
    setUsarMedias(true);
  }, [draft]);

  useEffect(() => {
    async function carregar() {
      try {
        const res = await fetch("/api/simulador/medias");
        if (res.ok) {
          const data = await res.json();
          setMedias(data);
          preencherComMedias(data);
        }
      } catch (e) {
        console.error("Erro ao carregar médias:", e);
      }
    }
    carregar();
  }, [preencherComMedias]);

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

  const cenariosParaSimular: CenarioSimulacao[] = useMemo(() => cenarios.map((c) => ({
    id: c.id,
    nome: c.nome,
    areaHa: num(c.areaHa),
    custoTarefa: num(c.custoTarefa) || num(c.custoHa) / TAREFAS_POR_HA,
    tPorHa: num(c.tPorHa),
    precoCana: num(c.precoCana),
  })), [cenarios]);

  const resultados = useMemo(() => {
    if (!medias) return [];
    return simularCenarios(cenariosParaSimular, medias);
  }, [cenariosParaSimular, medias]);

  const totalArea = resultados.reduce((s, r) => s + r.areaHa, 0);
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
        descricao="Simule cenários usando médias históricas dos seus dados reais ou informe valores manuais. O simulador projeta toneladas, receita, lucro, ROI e breakdown de custos."
      />

      {/* Card de médias históricas */}
      {medias && (
        <section className="rounded-[10px] border border-accent bg-accent-soft/30 p-5" aria-live="polite">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg text-accent-strong flex items-center gap-2">
              <Sparkles className="size-5" /> Médias históricas (dados reais)
            </h2>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={usarMedias}
                onChange={(e) => setUsarMedias(e.target.checked)}
                className="size-4 accent-accent"
              />
              Usar médias para preencher
            </label>
          </div>

          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-line bg-line sm:grid-cols-4 mb-3">
            <CelulaMetrica rotulo="Custo plantio/tarefa" valor={fmtMoney(medias.custoPlantioPorTarefa)} legenda="R$/tarefa" />
            <CelulaMetrica rotulo="Custo tratos/tarefa" valor={fmtMoney(medias.custoTratosPorTarefa)} legenda="R$/tarefa" />
            <CelulaMetrica rotulo="Custo colheita/tarefa" valor={fmtMoney(medias.custoColheitaPorTarefa)} legenda="R$/tarefa" />
            <CelulaMetrica rotulo="Total/tarefa" valor={fmtMoney(medias.custoTotalPorTarefa)} legenda="R$/tarefa" destaque />
          </div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-line bg-line sm:grid-cols-3 mt-2">
            <CelulaMetrica rotulo="Produtividade média" valor={`${medias.produtividadeMedia.toFixed(1).replace(".", ",")} t/ha`} legenda={`${medias.qtdColheitas} colheitas`} />
            <CelulaMetrica rotulo="Custo total/ha" valor={fmtMoney(medias.custoTotalPorHa)} legenda={`${medias.qtdPlantios + medias.qtdTratos + medias.qtdColheitas} registros`} />
            <CelulaMetrica rotulo="Total colhido" valor={fmtCount(medias.toneladasTotais)} legenda="toneladas" />
          </div>
        </section>
      )}

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
                    <th className="pb-2 pr-4 tnum">Lucro/ha</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {resultados.map((r) => (
                    <tr key={r.cenario.id} className="border-b border-line/50 hover:bg-surface-muted/50">
                      <td className="py-2 pr-4 font-medium text-ink">{r.cenario.nome}</td>
                      <td className="py-2 pr-4 tnum">{fmtCount(r.areaHa)}</td>
                      <td className="py-2 pr-4 tnum">{fmtMoney(r.custoTarefa)}</td>
                      <td className="py-2 pr-4 tnum">{fmtMoney(r.custoHa)}</td>
                      <td className="py-2 pr-4 tnum">{r.tPorHa.toFixed(1).replace(".", ",")}</td>
                      <td className="py-2 pr-4 tnum">{fmtMoney(r.precoCana)}</td>
                      <td className="py-2 pr-4 tnum font-medium">{fmtCount(r.toneladas)}</td>
                      <td className="py-2 pr-4 tnum">{fmtMoney(r.custoTotal)}</td>
                      <td className="py-2 pr-4 tnum">{fmtMoney(r.receita)}</td>
                      <td className="py-2 pr-4 tnum">{fmtMoney(r.lucro)}</td>
                      <td className="py-2 pr-4 tnum">{r.roi.toFixed(1).replace(".", ",")}%</td>
                      <td className="py-2 pr-4 tnum">{fmtMoney(r.lucroPorHa)}</td>
                      <td className="py-2">
                        <button
                          type="button"
                          onClick={() => remover(r.cenario.id)}
                          className="inline-flex size-8 items-center justify-center rounded-lg border border-line text-ink-3 transition-colors hover:border-danger-strong hover:text-danger-strong"
                          aria-label={`Remover ${r.cenario.nome}`}
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

          <section className="rounded-[10px] border border-accent bg-accent-soft/30 p-5" aria-live="polite" aria-atomic="true" aria-label="Resumo consolidado do simulador">
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

            <section className="mt-4">
              <h4 className="font-display text-md text-ink mb-2">Breakdown de custos (médias históricas)</h4>
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-line bg-line sm:grid-cols-3">
                <CelulaMetrica rotulo="Plantio" valor={fmtMoney(resultados.reduce((s, r) => s + r.custoPlantio, 0))} />
                <CelulaMetrica rotulo="Tratos" valor={fmtMoney(resultados.reduce((s, r) => s + r.custoTratos, 0))} />
                <CelulaMetrica rotulo="Colheita" valor={fmtMoney(resultados.reduce((s, r) => s + r.custoColheita, 0))} />
              </div>
            </section>

            {resultados.length > 1 && (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {resultados
                  .sort((a, b) => b.lucroPorHa - a.lucroPorHa)
                  .slice(0, 3)
                  .map((r, i) => (
                    <div key={r.cenario.id} className="rounded-lg border border-line bg-surface p-3">
                      <p className="text-xs text-ink-3">#{i + 1} melhor lucro/ha</p>
                      <p className="font-semibold text-ink">{r.cenario.nome}</p>
                      <p className="tnum text-sm font-bold text-accent">{fmtMoney(r.lucroPorHa)}/ha</p>
                      <p className="tnum text-xs text-ink-2">ROI {r.roi.toFixed(1).replace(".", ",")}% · {fmtCount(r.toneladas)} t</p>
                    </div>
                  ))}
              </div>
            )}
          </section>
        </>
      )}

      {cenarios.length === 0 && !medias && (
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