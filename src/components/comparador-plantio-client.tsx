"use client";

import { useMemo, useSyncExternalStore, useState } from "react";
import { Copy, Pencil, Plus, Trash2, Trophy } from "lucide-react";
import { fmtMoney, parseDecimal } from "@/lib/format";
import {
  MODOS_POR_TIPO,
  TIPOS_OPERACAO_LABEL,
  detalheOperacao,
  modoLabel,
  rankearOperacoes,
  simularOperacao,
  type CenarioOperacao,
  type TipoOperacao,
  type UnidadeCusto,
} from "@/lib/comparador-plantio";
import { Campo } from "./forms";
import { CelulaMetrica } from "./stat-cells";

/* ---------- Armazenamento local (por aparelho) ---------- */
const CHAVE = "canagest:projecao-operacoes:v1";
const CHAVE_ANTIGA = "canagest:projecao-plantio:v1";
const EVENTO = "canagest:projecao-operacoes:mudou";

function assinar(aoMudar: () => void) {
  window.addEventListener("storage", aoMudar);
  window.addEventListener(EVENTO, aoMudar);
  return () => {
    window.removeEventListener("storage", aoMudar);
    window.removeEventListener(EVENTO, aoMudar);
  };
}

interface CenarioAntigo {
  id: string;
  nome: string;
  modo: string;
  areaHa: number;
  produtividade: number;
  preco: number;
  custoColheitaHa: number;
  custoTratosHa: number;
  custosPlantio?: { nome: string; valorHa: number }[];
}

/** Converte cenários antigos (só plantio) para o novo modelo. */
function migrarAntigo(bruto: string): CenarioOperacao[] | null {
  try {
    const dados = JSON.parse(bruto);
    if (!Array.isArray(dados)) return null;
    const mapa = new Map<string, CenarioOperacao>();
    for (const d of dados as CenarioAntigo[]) {
      if (!d || typeof d !== "object") continue;
      // Se já tem o formato novo, copia direto.
      if ("tipo" in d && "custosFoco" in d) {
        if ((d as unknown as CenarioOperacao).id) mapa.set(d.id, d as unknown as CenarioOperacao);
        continue;
      }
      const custosFoco: ItemUI[] =
        d.custosPlantio && d.custosPlantio.length > 0
          ? d.custosPlantio.map((i) => ({ nome: i.nome, valor: String(i.valorHa), unidade: "ha" }))
          : [{ nome: "Plantio", valor: "0", unidade: "ha" }];
      const cen: CenarioOperacao = {
        id: d.id,
        tipo: "plantio",
        modo: d.modo ?? "proprio",
        nome: d.nome,
        areaHa: d.areaHa,
        produtividade: d.produtividade,
        preco: d.preco,
        custoColheitaHa: d.custoColheitaHa,
        custoTratosHa: d.custoTratosHa,
        custoPlantioHa: d.custosPlantio?.reduce((s, i) => s + i.valorHa, 0) ?? 0,
        cortes: 5,
        custosFoco: custosFoco.map((i) => ({
          nome: i.nome,
          valor: Number(i.valor) || 0,
          unidade: i.unidade,
        })),
      };
      mapa.set(cen.id, cen);
    }
    return [...mapa.values()];
  } catch {
    return null;
  }
}

const lerBruto = () => {
  const bruto = window.localStorage.getItem(CHAVE);
  if (bruto !== null) return bruto;
  // Migração da chave antiga, uma única vez.
  const antigo = window.localStorage.getItem(CHAVE_ANTIGA);
  if (antigo !== null) {
    const migrados = migrarAntigo(antigo);
    if (migrados) {
      const json = JSON.stringify(migrados);
      try {
        window.localStorage.setItem(CHAVE, json);
        window.localStorage.removeItem(CHAVE_ANTIGA);
      } catch {}
      return json;
    }
  }
  return "[]";
};
const lerBrutoServidor = () => "[]";

function gravar(cenarios: CenarioOperacao[]) {
  window.localStorage.setItem(CHAVE, JSON.stringify(cenarios));
  window.dispatchEvent(new Event(EVENTO));
}

function interpretar(bruto: string): CenarioOperacao[] {
  try {
    const dados = JSON.parse(bruto);
    return Array.isArray(dados) ? (dados as CenarioOperacao[]) : [];
  } catch {
    return [];
  }
}

/* ---------- Helpers de tipo ---------- */
type ItemUI = { nome: string; valor: string; unidade: UnidadeCusto };

type Campos = {
  tipo: TipoOperacao;
  nome: string;
  modo: string;
  areaHa: string;
  produtividade: string;
  preco: string;
  custoColheitaHa: string;
  custoTratosHa: string;
  custoPlantioHa: string;
  cortes: string;
  itens: ItemUI[];
};

const texto = (n: number) => (n > 0 ? String(n).replace(".", ",") : "");
const numero = (v: string) => {
  const n = parseDecimal(v);
  return Number.isFinite(n) ? n : 0;
};

function camposVazios(): Campos {
  return {
    tipo: "plantio",
    nome: "",
    modo: MODOS_POR_TIPO["plantio"][0].id,
    areaHa: "",
    produtividade: "",
    preco: "",
    custoColheitaHa: "",
    custoTratosHa: "",
    custoPlantioHa: "",
    cortes: "5",
    itens: [{ nome: "", valor: "", unidade: "ha" }],
  };
}

function itemValido(i: ItemUI): boolean {
  return i.nome.trim().length > 0 && Number(parseDecimal(i.valor)) > 0;
}

function paraCenario(c: Campos, id: string): CenarioOperacao {
  return {
    id,
    tipo: c.tipo,
    modo: c.modo,
    nome: c.nome.trim(),
    areaHa: numero(c.areaHa),
    produtividade: numero(c.produtividade),
    preco: numero(c.preco),
    cortes: Math.max(1, Math.round(numero(c.cortes)) || 1),
    custosFoco: c.itens.filter(itemValido).map((i) => ({
      nome: i.nome.trim(),
      valor: numero(i.valor),
      unidade: i.unidade,
    })),
    custoColheitaHa: numero(c.custoColheitaHa),
    custoTratosHa: numero(c.custoTratosHa),
    custoPlantioHa: numero(c.custoPlantioHa),
  };
}

function paraCampos(c: CenarioOperacao): Campos {
  const itens: ItemUI[] =
    c.custosFoco.length > 0
      ? c.custosFoco.map((i) => ({ nome: i.nome, valor: texto(i.valor), unidade: i.unidade }))
      : [{ nome: "", valor: "", unidade: "ha" }];
  return {
    tipo: c.tipo,
    nome: c.nome,
    modo: c.modo,
    areaHa: texto(c.areaHa),
    produtividade: texto(c.produtividade),
    preco: texto(c.preco),
    custoColheitaHa: texto(c.custoColheitaHa),
    custoTratosHa: texto(c.custoTratosHa),
    custoPlantioHa: texto(c.custoPlantioHa),
    cortes: String(c.cortes),
    itens,
  };
}

const pct = (n: number) => `${n.toFixed(1).replace(".", ",")}%`;
const t1 = (n: number) => n.toFixed(1).replace(".", ",");

export function ComparadorPlantioClient() {
  const bruto = useSyncExternalStore(assinar, lerBruto, lerBrutoServidor);
  const cenarios = useMemo(() => interpretar(bruto), [bruto]);

  const [campos, setCampos] = useState<Campos>(camposVazios);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  // Trocar o tipo reseta o modo para o primeiro da lista.
  function mudarTipo(tipo: TipoOperacao) {
    setCampos((atual) => ({ ...atual, tipo, modo: MODOS_POR_TIPO[tipo][0].id }));
  }

  const draft = paraCenario(campos, editandoId ?? "rascunho");
  const valido =
    draft.nome.length > 0 &&
    draft.areaHa > 0 &&
    draft.produtividade > 0 &&
    draft.preco > 0 &&
    draft.custosFoco.length > 0;
  const previa = simularOperacao(draft);
  const detalhe = detalheOperacao(draft);

  const mudar = (patch: Partial<Campos>) => setCampos((atual) => ({ ...atual, ...patch }));

  function mudarItem(idx: number, patch: Partial<ItemUI>) {
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

  function editar(c: CenarioOperacao) {
    setCampos(paraCampos(c));
    setEditandoId(c.id);
    document.getElementById("form-cenario")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function duplicar(c: CenarioOperacao) {
    gravar([...cenarios, { ...c, id: crypto.randomUUID(), nome: `${c.nome} (cópia)` }]);
  }

  function remover(id: string) {
    gravar(cenarios.filter((c) => c.id !== id));
    if (editandoId === id) limparFormulario();
  }

  const linhas = rankearOperacoes(cenarios);
  const melhor = linhas.length > 0 ? linhas[0].c.id : null;

  return (
    <div className="grid gap-8">
      {/* ---------- Explicação ---------- */}
      <section className="card grid gap-2 p-4 sm:p-6">
        <h2 className="font-display text-lg text-ink">Como funciona</h2>
        <p className="text-sm leading-relaxed text-ink-2">
          Compare <strong>como fazer uma operação</strong> no canavial — plantio, tratos ou colheita — com
          modos diferentes (próprio, usina, terceirizado, mecanizada, manual…). Cada custo pode ser
          informado <strong>por hectare</strong> ou como <strong>valor total</strong> (gastei X com isso,
          Y com aquilo…). O app soma tudo, dilui o plantio pelos cortes e mostra{" "}
          <strong>custo, receita e margem</strong> lado a lado.
        </p>
      </section>

      {/* ---------- Formulário ---------- */}
      <section id="form-cenario" aria-labelledby="titulo-cenario" className="card grid scroll-mt-24 gap-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="titulo-cenario" className="font-display text-lg text-ink">
            {editandoId ? "Editando cenário" : "Novo cenário"}
          </h2>
          {editandoId && (
            <button type="button" className="btn btn-ghost" onClick={limparFormulario}>
              Cancelar edição
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Campo label="Operação" htmlFor="op-tipo">
            <select
              id="op-tipo"
              className="field-input"
              value={campos.tipo}
              onChange={(e) => mudarTipo(e.target.value as TipoOperacao)}
            >
              {Object.entries(TIPOS_OPERACAO_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Quem faz" htmlFor="op-modo">
            <select
              id="op-modo"
              className="field-input"
              value={campos.modo}
              onChange={(e) => mudar({ modo: e.target.value })}
            >
              {MODOS_POR_TIPO[campos.tipo].map((m) => (
                <option key={m.id} value={m.id}>
                  {m.rotulo}
                </option>
              ))}
            </select>
          </Campo>
          <div className="sm:col-span-2">
            <Campo label="Nome do cenário" htmlFor="op-nome">
              <input
                id="op-nome"
                className="field-input"
                value={campos.nome}
                onChange={(e) => mudar({ nome: e.target.value })}
                placeholder={
                  campos.tipo === "colheita"
                    ? "Ex.: Mecanizada vs manual"
                    : campos.tipo === "tratos"
                      ? "Ex.: Protocolo caro vs simples"
                      : "Ex.: Próprio — protocolo caro"
                }
              />
            </Campo>
          </div>
          <Campo label="Área (ha)" htmlFor="op-area">
            <input id="op-area" className="field-input tnum" inputMode="decimal" value={campos.areaHa} onChange={(e) => mudar({ areaHa: e.target.value })} placeholder="20" />
          </Campo>
          <Campo label="Cortes esperados" htmlFor="op-cortes" hint="Divide plantio e receita ao longo da vida útil">
            <input id="op-cortes" className="field-input tnum" inputMode="numeric" value={campos.cortes} onChange={(e) => mudar({ cortes: e.target.value })} />
          </Campo>
          <Campo label="Produtividade (t/ha)" htmlFor="op-prod">
            <input id="op-prod" className="field-input tnum" inputMode="decimal" value={campos.produtividade} onChange={(e) => mudar({ produtividade: e.target.value })} placeholder="85" />
          </Campo>
          <Campo label="Preço da cana (R$/t)" htmlFor="op-preco">
            <input id="op-preco" className="field-input tnum" inputMode="decimal" value={campos.preco} onChange={(e) => mudar({ preco: e.target.value })} placeholder="164" />
          </Campo>
        </div>

        {/* Custos das outras operações — comum para fechar o cálculo */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo label="Custo da colheita (R$/ha)" htmlFor="op-colheita" hint="Por corte" >
            <input id="op-colheita" className="field-input tnum" inputMode="decimal" value={campos.custoColheitaHa} onChange={(e) => mudar({ custoColheitaHa: e.target.value })} />
          </Campo>
          <Campo label="Custo dos tratos (R$/ha)" htmlFor="op-tratos" hint="Por corte">
            <input id="op-tratos" className="field-input tnum" inputMode="decimal" value={campos.custoTratosHa} onChange={(e) => mudar({ custoTratosHa: e.target.value })} />
          </Campo>
          <Campo label="Custo do plantio (R$/ha)" htmlFor="op-plantio" hint="Valor cheio, uma vez">
            <input id="op-plantio" className="field-input tnum" inputMode="decimal" value={campos.custoPlantioHa} onChange={(e) => mudar({ custoPlantioHa: e.target.value })} />
          </Campo>
        </div>

        {/* Itens da operação focada */}
        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-ink">
              Custos da {TIPOS_OPERACAO_LABEL[campos.tipo].toLowerCase()} (R$)
            </p>
            <button
              type="button"
              className="text-sm font-semibold text-accent hover:text-accent-strong"
              onClick={() =>
                setCampos((atual) => ({ ...atual, itens: [...atual.itens, { nome: "", valor: "", unidade: "ha" }] }))
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
                  placeholder="Descrição do custo (mudas, combustível, mão de obra…)"
                  maxLength={60}
                />
                <input
                  className="field-input tnum w-28"
                  inputMode="decimal"
                  value={item.valor}
                  onChange={(e) => mudarItem(idx, { valor: e.target.value })}
                  placeholder="0,00"
                />
                <select
                  className="field-input w-40"
                  value={item.unidade}
                  onChange={(e) => mudarItem(idx, { unidade: e.target.value as UnidadeCusto })}
                >
                  <option value="ha">por hectare</option>
                  <option value="total">valor total</option>
                </select>
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
          <p className="text-xs text-ink-3">
            Informe cada custo por hectare OU o total na área. Ex.: terreno R$ 20.000 (total) + mudas
            R$ 2.500/ha + correção R$ 30.000 (total).
          </p>
        </div>

        {/* Prévia */}
        <div aria-live="polite" className="grid gap-3">
          <p className="eyebrow">Prévia — atualiza enquanto você digita</p>
          <div className="metric-grid grid-cols-2 lg:grid-cols-4">
            <CelulaMetrica rotulo="Lucro" valor={fmtMoney(previa.lucroHa)} legenda={`${fmtMoney(previa.lucro)} total`} destaque />
            <CelulaMetrica rotulo={`Custo da ${TIPOS_OPERACAO_LABEL[campos.tipo].toLowerCase()}`} valor={fmtMoney(previa.custoFocoHa)} legenda="/ha" />
            <CelulaMetrica rotulo="Custo total" valor={fmtMoney(previa.custoHa)} legenda="/ha por corte" />
            <CelulaMetrica rotulo="Margem" valor={pct(previa.margem)} legenda={`equilíbrio ${t1(detalhe.produtividadeEquilibrio)} t/ha`} />
          </div>
          {detalhe.itens.length > 0 && (
            <p className="text-xs text-ink-3">
              Maior custo: <strong>{detalhe.itens.sort((a, b) => b.porHa - a.porHa)[0].nome}</strong> (
              {fmtMoney(detalhe.itens.sort((a, b) => b.porHa - a.porHa)[0].porHa)}/ha).
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-primary" disabled={!valido} onClick={salvar}>
            <Plus className="size-4" aria-hidden="true" /> {editandoId ? "Salvar alterações" : "Adicionar à comparação"}
          </button>
          {!valido && (
            <p className="text-sm text-ink-3">Informe nome, área, produtividade, preço e ao menos um custo.</p>
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
                  <th>Operação</th>
                  <th>Quem faz</th>
                  <th>Protocolo</th>
                  <th className="num">t/ha</th>
                  <th className="num">Custo op./ha</th>
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
                    <td className="font-semibold text-ink">{TIPOS_OPERACAO_LABEL[c.tipo]}</td>
                    <td className="text-ink-2">{modoLabel(c.tipo, c.modo)}</td>
                    <td className="text-ink-2">
                      <span className="inline-flex items-center gap-2">
                        {c.nome}
                        {c.id === melhor && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-1.5 py-0.5 text-xs font-bold text-accent-strong">
                            <Trophy className="size-3" aria-hidden="true" /> Melhor
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="num">{t1(c.produtividade)}</td>
                    <td className="num">{fmtMoney(r.custoFocoHa)}</td>
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
            Onde o dinheiro vai
          </h2>
          <p className="text-sm text-ink-2">
            Composição do custo da operação do melhor cenário (<strong>{linhas[0].c.nome}</strong>), por hectare.
          </p>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="num">R$/ha</th>
                  <th className="num">% da operação</th>
                </tr>
              </thead>
              <tbody>
                {detalheOperacao(linhas[0].c)
                  .itens.filter((i) => i.porHa > 0)
                  .sort((a, b) => b.porHa - a.porHa)
                  .map((i) => (
                    <tr key={i.nome}>
                      <td className="text-ink">{i.nome}</td>
                      <td className="num">{fmtMoney(i.porHa)}</td>
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