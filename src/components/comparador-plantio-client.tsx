"use client";

import { useMemo, useSyncExternalStore, useState } from "react";
import { Copy, Pencil, Plus, Trash2, Trophy } from "lucide-react";
import { fmtMoney, parseDecimal } from "@/lib/format";
import {
  MODOS_EXECUCAO,
  detalhePlantio,
  rankearCenarios,
  simularPlantio,
  type CenarioPlantio,
  type ModoExecucao,
} from "@/lib/comparador-plantio";
import { Campo } from "./forms";
import { CelulaMetrica } from "./stat-cells";

/* ---------- Armazenamento local (por aparelho) ---------- */
const CHAVE = "canagest:projecao-plantio:v1";
const EVENTO = "canagest:projecao-plantio:mudou";

function assinar(aoMudar: () => void) {
  window.addEventListener("storage", aoMudar);
  window.addEventListener(EVENTO, aoMudar);
  return () => {
    window.removeEventListener("storage", aoMudar);
    window.removeEventListener(EVENTO, aoMudar);
  };
}
const lerBruto = () => window.localStorage.getItem(CHAVE) ?? "[]";
const lerBrutoServidor = () => "[]";

function gravar(cenarios: CenarioPlantio[]) {
  window.localStorage.setItem(CHAVE, JSON.stringify(cenarios));
  window.dispatchEvent(new Event(EVENTO));
}

function interpretar(bruto: string): CenarioPlantio[] {
  try {
    const dados = JSON.parse(bruto);
    return Array.isArray(dados) ? (dados as CenarioPlantio[]) : [];
  } catch {
    return [];
  }
}

/* ---------- Helpers de tipo ---------- */
type Campos = {
  nome: string;
  modo: ModoExecucao;
  areaHa: string;
  produtividade: string;
  preco: string;
  custoColheitaHa: string;
  custoTratosHa: string;
  cortes: string;
  itens: ItemCustoPlantioUI[];
};

type ItemCustoPlantioUI = { nome: string; valor: string };

const texto = (n: number) => (n > 0 ? String(n).replace(".", ",") : "");
const numero = (v: string) => {
  const n = parseDecimal(v);
  return Number.isFinite(n) ? n : 0;
};

function camposVazios(): Campos {
  return {
    nome: "",
    modo: "proprio",
    areaHa: "",
    produtividade: "",
    preco: "",
    custoColheitaHa: "",
    custoTratosHa: "",
    cortes: "5",
    itens: [{ nome: "", valor: "" }],
  };
}

function itemValido(i: ItemCustoPlantioUI): i is { nome: string; valor: string } {
  return i.nome.trim().length > 0 && Number(parseDecimal(i.valor)) > 0;
}

function paraCenario(c: Campos, id: string): CenarioPlantio {
  return {
    id,
    nome: c.nome.trim(),
    modo: c.modo,
    areaHa: numero(c.areaHa),
    produtividade: numero(c.produtividade),
    preco: numero(c.preco),
    custoColheitaHa: numero(c.custoColheitaHa),
    custoTratosHa: numero(c.custoTratosHa),
    cortes: Math.max(1, Math.round(numero(c.cortes)) || 1),
    custosPlantio: c.itens.filter(itemValido).map((i) => ({
      nome: i.nome.trim(),
      valorHa: numero(i.valor),
    })),
  };
}

function paraCampos(c: CenarioPlantio): Campos {
  return {
    nome: c.nome,
    modo: c.modo,
    areaHa: texto(c.areaHa),
    produtividade: texto(c.produtividade),
    preco: texto(c.preco),
    custoColheitaHa: texto(c.custoColheitaHa),
    custoTratosHa: texto(c.custoTratosHa),
    cortes: String(c.cortes),
    itens:
      c.custosPlantio.length > 0
        ? c.custosPlantio.map((i) => ({ nome: i.nome, valor: texto(i.valorHa) }))
        : [{ nome: "", valor: "" }],
  };
}

const pct = (n: number) => `${n.toFixed(1).replace(".", ",")}%`;
const t1 = (n: number) => n.toFixed(1).replace(".", ",");

export function ComparadorPlantioClient() {
  const bruto = useSyncExternalStore(assinar, lerBruto, lerBrutoServidor);
  const cenarios = useMemo(() => interpretar(bruto), [bruto]);

  const [campos, setCampos] = useState<Campos>(camposVazios);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const draft = paraCenario(campos, editandoId ?? "rascunho");
  const valido = draft.nome.length > 0 && draft.areaHa > 0 && draft.produtividade > 0 && draft.preco > 0 && draft.custosPlantio.length > 0;
  const previa = simularPlantio(draft);
  const detalhe = detalhePlantio(draft);

  const mudar = (patch: Partial<Campos>) => setCampos((atual) => ({ ...atual, ...patch }));

  function mudarItem(idx: number, patch: Partial<ItemCustoPlantioUI>) {
    setCampos((atual) => ({
      ...atual,
      itens: atual.itens.map((i, k) => (k === idx ? { ...i, ...patch } : i)),
    }));
  }

  function limparFormulario() {
    setCampos(camposVazios());
    setEditandoId(null);
  }

  function salvar() {
    if (!valido) return;
    if (editandoId) {
      gravar(cenarios.map((c) => (c.id === editandoId ? draft : c)));
    } else {
      gravar([...cenarios, { ...draft, id: crypto.randomUUID() }]);
    }
    limparFormulario();
  }

  function editar(c: CenarioPlantio) {
    setCampos(paraCampos(c));
    setEditandoId(c.id);
    document.getElementById("form-cenario")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function duplicar(c: CenarioPlantio) {
    gravar([...cenarios, { ...c, id: crypto.randomUUID(), nome: `${c.nome} (cópia)` }]);
  }

  function remover(id: string) {
    gravar(cenarios.filter((c) => c.id !== id));
    if (editandoId === id) limparFormulario();
  }

  const linhas = rankearCenarios(cenarios);
  const melhor = linhas.length > 0 ? linhas[0].c.id : null;

  return (
    <div className="grid gap-8">
      {/* ---------- Explicação ---------- */}
      <section className="card grid gap-2 p-4 sm:p-6">
        <h2 className="font-display text-lg text-ink">Como funciona</h2>
        <p className="text-sm leading-relaxed text-ink-2">
          Monte o <strong>custo de plantar</strong> (mudas, correção, calagem, adubação, mecanização, mão
          de obra…) e a <strong>produtividade esperada</strong> de cada cenário — plantio próprio, pela
          usina, terceirizado, ou protocolos diferentes. O app dilui o plantio pelos cortes e mostra{" "}
          <strong>custo, receita e margem</strong> lado a lado. Um protocolo caro pode dar mais toneladas,
          mas a <strong>margem</strong> não necessariamente acompanha.
        </p>
      </section>

      {/* ---------- Formulário ---------- */}
      <section id="form-cenario" aria-labelledby="titulo-cenario" className="card grid scroll-mt-24 gap-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="titulo-cenario" className="font-display text-lg text-ink">
            {editandoId ? "Editando cenário" : "Novo cenário de plantio"}
          </h2>
          {editandoId && (
            <button type="button" className="btn btn-ghost" onClick={limparFormulario}>
              Cancelar edição
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <Campo label="Nome do cenário" htmlFor="pj-nome">
              <input
                id="pj-nome"
                className="field-input"
                value={campos.nome}
                onChange={(e) => mudar({ nome: e.target.value })}
                placeholder="Ex.: Próprio — protocolo caro"
              />
            </Campo>
          </div>
          <Campo label="Quem planta" htmlFor="pj-modo">
            <select
              id="pj-modo"
              className="field-input"
              value={campos.modo}
              onChange={(e) => mudar({ modo: e.target.value as ModoExecucao })}
            >
              {Object.entries(MODOS_EXECUCAO).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Área (ha)" htmlFor="pj-area">
            <input id="pj-area" className="field-input tnum" inputMode="decimal" value={campos.areaHa} onChange={(e) => mudar({ areaHa: e.target.value })} placeholder="20" />
          </Campo>
          <Campo label="Cortes esperados" htmlFor="pj-cortes" hint="Divide o custo do plantio">
            <input id="pj-cortes" className="field-input tnum" inputMode="numeric" value={campos.cortes} onChange={(e) => mudar({ cortes: e.target.value })} />
          </Campo>
          <Campo label="Produtividade (t/ha)" htmlFor="pj-prod" hint="Resultado do protocolo">
            <input id="pj-prod" className="field-input tnum" inputMode="decimal" value={campos.produtividade} onChange={(e) => mudar({ produtividade: e.target.value })} placeholder="85" />
          </Campo>
          <Campo label="Preço da cana (R$/t)" htmlFor="pj-preco">
            <input id="pj-preco" className="field-input tnum" inputMode="decimal" value={campos.preco} onChange={(e) => mudar({ preco: e.target.value })} placeholder="164" />
          </Campo>
          <Campo label="Custo de colheita (R$/ha)" htmlFor="pj-colheita" hint="Por corte">
            <input id="pj-colheita" className="field-input tnum" inputMode="decimal" value={campos.custoColheitaHa} onChange={(e) => mudar({ custoColheitaHa: e.target.value })} />
          </Campo>
          <Campo label="Custo de tratos (R$/ha)" htmlFor="pj-tratos" hint="Por corte">
            <input id="pj-tratos" className="field-input tnum" inputMode="decimal" value={campos.custoTratosHa} onChange={(e) => mudar({ custoTratosHa: e.target.value })} />
          </Campo>
        </div>

        {/* Itens do plantio */}
        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-ink">Custos do plantio (R$/ha)</p>
            <button
              type="button"
              className="text-sm font-semibold text-accent hover:text-accent-strong"
              onClick={() =>
                setCampos((atual) => ({ ...atual, itens: [...atual.itens, { nome: "", valor: "" }] }))
              }
            >
              + Adicionar item
            </button>
          </div>
          <div className="grid gap-2">
            {campos.itens.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  className="field-input min-w-0 flex-1"
                  value={item.nome}
                  onChange={(e) => mudarItem(idx, { nome: e.target.value })}
                  placeholder="Ex.: Mudas, Correção de solo, Calagem, Adubação, Gradagem…"
                  maxLength={60}
                />
                <input
                  className="field-input tnum w-28"
                  inputMode="decimal"
                  value={item.valor}
                  onChange={(e) => mudarItem(idx, { valor: e.target.value })}
                  placeholder="0,00"
                />
                <button
                  type="button"
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-ink-3 transition-colors hover:border-danger-strong/25 hover:bg-danger-soft hover:text-danger-strong"
                  onClick={() => setCampos((atual) => ({ ...atual, itens: atual.itens.filter((_, k) => k !== idx) }))}
                  aria-label="Remover item de custo"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Prévia */}
        <div aria-live="polite" className="grid gap-3">
          <p className="eyebrow">Prévia — atualiza enquanto você digita</p>
          <div className="metric-grid grid-cols-2 lg:grid-cols-4">
            <CelulaMetrica rotulo="Lucro" valor={fmtMoney(previa.lucroHa)} legenda={`${fmtMoney(previa.lucro)} total`} destaque />
            <CelulaMetrica rotulo="Custo plantio" valor={fmtMoney(previa.custoPlantioHa)} legenda="/ha, uma vez" />
            <CelulaMetrica rotulo="Custo por corte" valor={fmtMoney(previa.custoHa)} legenda="/ha" />
            <CelulaMetrica rotulo="Margem" valor={pct(previa.margem)} legenda={`equilíbrio ${t1(detalhe.produtividadeEquilibrio)} t/ha`} />
          </div>
          {detalhe.itens.length > 0 && (
            <p className="text-xs text-ink-3">
              Maior custo do plantio: <strong>{detalhe.itens.sort((a, b) => b.valorHa - a.valorHa)[0].nome}</strong> (
              {pct(Math.max(...detalhe.itens.map((i) => i.percentual)))} do total).
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-primary" disabled={!valido} onClick={salvar}>
            <Plus className="size-4" aria-hidden="true" /> {editandoId ? "Salvar alterações" : "Adicionar à comparação"}
          </button>
          {!valido && (
            <p className="text-sm text-ink-3">Informe nome, área, produtividade, preço e ao menos um custo de plantio.</p>
          )}
        </div>
      </section>

      {/* ---------- Comparação ---------- */}
      <section aria-labelledby="titulo-comparacao" className="grid gap-3">
        <h2 id="titulo-comparacao" className="font-display text-lg text-ink">
          Comparação de custos × receita
        </h2>

        {linhas.length === 0 ? (
          <div className="card p-6 text-center text-sm text-ink-2">
            Nenhum cenário salvo. Monte um acima e adicione para comparar. Os cenários ficam salvos neste aparelho.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Quem planta</th>
                  <th>Protocolo</th>
                  <th className="num">t/ha</th>
                  <th className="num">Custo plantio/ha</th>
                  <th className="num">Custo corte/ha</th>
                  <th className="num">Receita/ha</th>
                  <th className="num">Lucro/ha</th>
                  <th className="num">Margem</th>
                  <th className="num">ROI</th>
                  <th>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {linhas.map(({ c, r }) => (
                  <tr key={c.id}>
                    <td className="font-semibold text-ink">
                      <span className="inline-flex items-center gap-2">
                        {MODOS_EXECUCAO[c.modo]}
                        {c.id === melhor && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-1.5 py-0.5 text-xs font-bold text-accent-strong">
                            <Trophy className="size-3" aria-hidden="true" /> Melhor
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="text-ink-2">{c.nome}</td>
                    <td className="num">{t1(c.produtividade)}</td>
                    <td className="num">{fmtMoney(r.custoPlantioHa)}</td>
                    <td className="num">{fmtMoney(r.custoHa)}</td>
                    <td className="num">{fmtMoney(r.receitaHa)}</td>
                    <td className={`num font-bold ${r.lucroHa < 0 ? "text-danger-strong" : "text-accent-strong"}`}>{fmtMoney(r.lucroHa)}</td>
                    <td className="num">{pct(r.margem)}</td>
                    <td className="num">{pct(r.roi)}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button type="button" className="btn btn-ghost !min-h-9 !px-2" onClick={() => editar(c)} aria-label={`Editar ${c.nome}`}>
                          <Pencil className="size-4" aria-hidden="true" />
                        </button>
                        <button type="button" className="btn btn-ghost !min-h-9 !px-2" onClick={() => duplicar(c)} aria-label={`Duplicar ${c.nome}`}>
                          <Copy className="size-4" aria-hidden="true" />
                        </button>
                        <button type="button" className="btn btn-ghost !min-h-9 !px-2 hover:!bg-danger-soft hover:!text-danger-strong" onClick={() => remover(c.id)} aria-label={`Remover ${c.nome}`}>
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ---------- Detalhe do item em destaque ---------- */}
      {linhas.length > 0 && (
        <section aria-labelledby="titulo-det" className="grid gap-3">
          <h2 id="titulo-det" className="font-display text-lg text-ink">
            Onde o dinheiro do plantio vai
          </h2>
          <p className="text-sm text-ink-2">
            Composição do custo de plantio do melhor cenário (<strong>{linhas[0].c.nome}</strong>), por hectare.
          </p>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="num">R$/ha</th>
                  <th className="num">% do plantio</th>
                </tr>
              </thead>
              <tbody>
                {detalhePlantio(linhas[0].c)
                  .itens.filter((i) => i.valorHa > 0)
                  .sort((a, b) => b.valorHa - a.valorHa)
                  .map((i) => (
                    <tr key={i.nome}>
                      <td className="text-ink">{i.nome}</td>
                      <td className="num">{fmtMoney(i.valorHa)}</td>
                      <td className="num">{pct(i.percentual)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}