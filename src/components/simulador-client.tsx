"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Copy, Info, Pencil, Plus, RotateCcw, Trash2, Trophy } from "lucide-react";
import { fmtCount, fmtMoney, parseDecimal } from "@/lib/format";
import {
  simular,
  sensibilidade,
  VARIACOES_PRECO,
  VARIACOES_PRODUTIVIDADE,
  type Cenario,
  type MediasHistoricas,
} from "@/lib/simulador";
import { Campo } from "./forms";
import { CelulaMetrica } from "./stat-cells";

/* ---------- Armazenamento local (por aparelho) ---------- */
const CHAVE = "canagest:simulador:v1";
const EVENTO = "canagest:simulador:mudou";

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

function gravar(cenarios: Cenario[]) {
  window.localStorage.setItem(CHAVE, JSON.stringify(cenarios));
  window.dispatchEvent(new Event(EVENTO));
}

function interpretar(bruto: string): Cenario[] {
  try {
    const dados = JSON.parse(bruto);
    return Array.isArray(dados) ? (dados as Cenario[]) : [];
  } catch {
    return [];
  }
}

/* ---------- Formulário ---------- */
type Campos = {
  nome: string;
  areaHa: string;
  produtividade: string;
  preco: string;
  custoColheitaHa: string;
  custoTratosHa: string;
  custoPlantioHa: string;
  cortes: string;
};

const texto = (n: number, casas = 2) =>
  n > 0 ? n.toFixed(casas).replace(".", ",") : "";

function camposDasMedias(m: MediasHistoricas): Campos {
  return {
    nome: "",
    areaHa: "",
    produtividade: texto(m.produtividade, 1),
    preco: texto(m.precoMedio),
    custoColheitaHa: texto(m.custoColheitaHa),
    custoTratosHa: texto(m.custoTratosHa),
    custoPlantioHa: texto(m.custoPlantioHa),
    cortes: "5",
  };
}

const numero = (v: string) => {
  const n = parseDecimal(v);
  return Number.isFinite(n) ? n : 0;
};

function paraCenario(c: Campos, id: string): Cenario {
  return {
    id,
    nome: c.nome.trim(),
    areaHa: numero(c.areaHa),
    produtividade: numero(c.produtividade),
    preco: numero(c.preco),
    custoColheitaHa: numero(c.custoColheitaHa),
    custoTratosHa: numero(c.custoTratosHa),
    custoPlantioHa: numero(c.custoPlantioHa),
    cortes: Math.max(1, Math.round(numero(c.cortes)) || 1),
  };
}

function paraCampos(c: Cenario): Campos {
  return {
    nome: c.nome,
    areaHa: texto(c.areaHa),
    produtividade: texto(c.produtividade, 1),
    preco: texto(c.preco),
    custoColheitaHa: texto(c.custoColheitaHa),
    custoTratosHa: texto(c.custoTratosHa),
    custoPlantioHa: texto(c.custoPlantioHa),
    cortes: String(c.cortes),
  };
}

const t1 = (n: number) => n.toFixed(1).replace(".", ",");
const pct = (n: number) => `${t1(n)}%`;

export function SimuladorClient({ medias }: { medias: MediasHistoricas }) {
  const bruto = useSyncExternalStore(assinar, lerBruto, lerBrutoServidor);
  const cenarios = useMemo(() => interpretar(bruto), [bruto]);

  const [campos, setCampos] = useState<Campos>(() => camposDasMedias(medias));
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const temHistorico = medias.qtdColheitas > 0 && medias.haColhidos > 0;
  const draft = paraCenario(campos, editandoId ?? "rascunho");
  const valido =
    draft.nome.length > 0 && draft.areaHa > 0 && draft.produtividade > 0 && draft.preco > 0;
  const previa = simular(draft);

  const mudar = (campo: keyof Campos, valor: string) =>
    setCampos((atual) => ({ ...atual, [campo]: valor }));

  function limparFormulario() {
    setCampos(camposDasMedias(medias));
    setEditandoId(null);
  }

  function salvarCenario() {
    if (!valido) return;
    if (editandoId) {
      gravar(cenarios.map((c) => (c.id === editandoId ? draft : c)));
    } else {
      gravar([...cenarios, { ...draft, id: crypto.randomUUID() }]);
    }
    limparFormulario();
  }

  function editar(c: Cenario) {
    setCampos(paraCampos(c));
    setEditandoId(c.id);
    document.getElementById("form-cenario")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function duplicar(c: Cenario) {
    gravar([...cenarios, { ...c, id: crypto.randomUUID(), nome: `${c.nome} (cópia)` }]);
  }

  function remover(id: string) {
    gravar(cenarios.filter((c) => c.id !== id));
    if (editandoId === id) limparFormulario();
  }

  const linhas = cenarios.map((c) => ({ c, r: simular(c) }));
  const melhorId = linhas.length > 1
    ? linhas.reduce((a, b) => (b.r.lucroHa > a.r.lucroHa ? b : a)).c.id
    : null;

  const foco = valido ? draft : cenarios.at(-1);
  const matriz = foco ? sensibilidade(foco) : null;

  return (
    <div className="grid gap-8">
      {/* ---------- Base histórica ---------- */}
      <section aria-labelledby="titulo-base" className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="titulo-base" className="font-display text-lg text-ink">
            Base histórica dos seus registros
          </h2>
          {temHistorico && (
            <button type="button" className="btn btn-secondary" onClick={() => setCampos((c) => ({ ...camposDasMedias(medias), nome: c.nome, areaHa: c.areaHa }))}>
              <RotateCcw className="size-4" aria-hidden="true" /> Preencher com as médias
            </button>
          )}
        </div>

        {temHistorico ? (
          <>
            <div className="metric-grid grid-cols-2 lg:grid-cols-4">
              <CelulaMetrica rotulo="Produtividade" valor={`${t1(medias.produtividade)} t/ha`} legenda={`${t1(medias.haColhidos)} ha colhidos`} />
              <CelulaMetrica rotulo="Preço médio" valor={`${fmtMoney(medias.precoMedio)}/t`} legenda="receita ÷ toneladas" />
              <CelulaMetrica rotulo="Colheita" valor={`${fmtMoney(medias.custoColheitaHa)}/ha`} legenda="por corte" />
              <CelulaMetrica rotulo="Tratos" valor={`${fmtMoney(medias.custoTratosHa)}/ha`} legenda="por ha colhido" />
            </div>
            <p className="flex items-start gap-2 text-sm text-ink-2">
              <Info className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden="true" />
              <span>
                Calculado com {medias.qtdColheitas} colheita(s), {medias.qtdTratos} trato(s) e {medias.qtdPlantios}{" "}
                plantio(s) do caderno de campo (projeções ficam de fora). O plantio custa{" "}
                <strong>{fmtMoney(medias.custoPlantioHa)}/ha</strong> uma única vez e é diluído nos cortes.
                {medias.plantiosSemArea > 0 && ` ${medias.plantiosSemArea} plantio(s) sem área informada foram ignorados.`}
              </span>
            </p>
          </>
        ) : (
          <div className="card flex items-start gap-3 p-4 text-sm text-ink-2">
            <Info className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden="true" />
            <p>
              Ainda não há colheitas com área para calcular médias. Preencha os valores abaixo à mão; assim que você
              registrar colheitas, o simulador passa a sugerir produtividade, preço e custos reais.
            </p>
          </div>
        )}
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
          <div className="sm:col-span-2">
            <Campo label="Nome do cenário" htmlFor="sim-nome">
              <input id="sim-nome" className="field-input" value={campos.nome} onChange={(e) => mudar("nome", e.target.value)} placeholder="Ex.: Reforma do talhão 12" />
            </Campo>
          </div>
          <Campo label="Área (ha)" htmlFor="sim-area">
            <input id="sim-area" className="field-input tnum" inputMode="decimal" value={campos.areaHa} onChange={(e) => mudar("areaHa", e.target.value)} placeholder="20" />
          </Campo>
          <Campo label="Cortes esperados" htmlFor="sim-cortes" hint="Divide o custo do plantio">
            <input id="sim-cortes" className="field-input tnum" inputMode="numeric" value={campos.cortes} onChange={(e) => mudar("cortes", e.target.value)} />
          </Campo>
          <Campo label="Produtividade (t/ha)" htmlFor="sim-tph" hint={temHistorico ? `Média: ${t1(medias.produtividade)}` : undefined}>
            <input id="sim-tph" className="field-input tnum" inputMode="decimal" value={campos.produtividade} onChange={(e) => mudar("produtividade", e.target.value)} placeholder="85" />
          </Campo>
          <Campo label="Preço da cana (R$/t)" htmlFor="sim-preco" hint={temHistorico ? `Média: ${fmtMoney(medias.precoMedio)}` : undefined}>
            <input id="sim-preco" className="field-input tnum" inputMode="decimal" value={campos.preco} onChange={(e) => mudar("preco", e.target.value)} placeholder="164" />
          </Campo>
          <Campo label="Custo de colheita (R$/ha)" htmlFor="sim-colheita" hint={temHistorico ? `Média: ${fmtMoney(medias.custoColheitaHa)}` : undefined}>
            <input id="sim-colheita" className="field-input tnum" inputMode="decimal" value={campos.custoColheitaHa} onChange={(e) => mudar("custoColheitaHa", e.target.value)} />
          </Campo>
          <Campo label="Custo de tratos (R$/ha)" htmlFor="sim-tratos" hint={temHistorico ? `Média: ${fmtMoney(medias.custoTratosHa)}` : undefined}>
            <input id="sim-tratos" className="field-input tnum" inputMode="decimal" value={campos.custoTratosHa} onChange={(e) => mudar("custoTratosHa", e.target.value)} />
          </Campo>
          <Campo label="Custo do plantio (R$/ha)" htmlFor="sim-plantio" hint={medias.custoPlantioHa > 0 ? `Média: ${fmtMoney(medias.custoPlantioHa)}` : "Valor cheio, uma vez"}>
            <input id="sim-plantio" className="field-input tnum" inputMode="decimal" value={campos.custoPlantioHa} onChange={(e) => mudar("custoPlantioHa", e.target.value)} />
          </Campo>
        </div>

        <div aria-live="polite" className="grid gap-3">
          <p className="eyebrow">Prévia — atualiza enquanto você digita</p>
          <div className="metric-grid grid-cols-2 lg:grid-cols-4">
            <CelulaMetrica rotulo="Lucro" valor={fmtMoney(previa.lucro)} legenda={`${fmtMoney(previa.lucroHa)}/ha`} destaque />
            <CelulaMetrica rotulo="Receita" valor={fmtMoney(previa.receita)} legenda={`${fmtCount(previa.toneladas)} t`} />
            <CelulaMetrica rotulo="Custo total" valor={fmtMoney(previa.custoTotal)} legenda={`${fmtMoney(previa.custoHa)}/ha por corte`} />
            <CelulaMetrica rotulo="Retorno (ROI)" valor={pct(previa.roi)} legenda={`margem ${pct(previa.margem)}`} />
          </div>
          <p className="text-sm text-ink-2">
            Empata com <strong>{t1(previa.produtividadeEquilibrio)} t/ha</strong> ao preço informado; o custo por
            tonelada é <strong>{fmtMoney(previa.custoPorTonelada)}</strong>. Plantio diluído:{" "}
            {fmtMoney(previa.custoPlantioPorCorteHa)}/ha por corte.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-primary" disabled={!valido} onClick={salvarCenario}>
            <Plus className="size-4" aria-hidden="true" /> {editandoId ? "Salvar alterações" : "Adicionar à comparação"}
          </button>
          {!valido && (
            <p className="text-sm text-ink-3">Informe nome, área, produtividade e preço para salvar.</p>
          )}
        </div>
      </section>

      {/* ---------- Comparação ---------- */}
      <section aria-labelledby="titulo-comparacao" className="grid gap-3">
        <h2 id="titulo-comparacao" className="font-display text-lg text-ink">
          Comparação de cenários
        </h2>

        {linhas.length === 0 ? (
          <div className="card p-6 text-center text-sm text-ink-2">
            Nenhum cenário salvo. Monte um acima e adicione para comparar lado a lado. Os cenários ficam salvos
            neste aparelho.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cenário</th>
                  <th className="num">Área</th>
                  <th className="num">t/ha</th>
                  <th className="num">Preço/t</th>
                  <th className="num">Custo/ha</th>
                  <th className="num">Receita</th>
                  <th className="num">Custo total</th>
                  <th className="num">Lucro</th>
                  <th className="num">Lucro/ha</th>
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
                        {c.nome}
                        {c.id === melhorId && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-1.5 py-0.5 text-xs font-bold text-accent-strong">
                            <Trophy className="size-3" aria-hidden="true" /> Melhor
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="num">{t1(c.areaHa)} ha</td>
                    <td className="num">{t1(c.produtividade)}</td>
                    <td className="num">{fmtMoney(c.preco)}</td>
                    <td className="num">{fmtMoney(r.custoHa)}</td>
                    <td className="num">{fmtMoney(r.receita)}</td>
                    <td className="num">{fmtMoney(r.custoTotal)}</td>
                    <td className={`num font-bold ${r.lucro < 0 ? "text-danger-strong" : "text-accent-strong"}`}>{fmtMoney(r.lucro)}</td>
                    <td className="num">{fmtMoney(r.lucroHa)}</td>
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

      {/* ---------- Sensibilidade ---------- */}
      {foco && matriz && (
        <section aria-labelledby="titulo-sens" className="grid gap-3">
          <div>
            <h2 id="titulo-sens" className="font-display text-lg text-ink">
              E se a produtividade ou o preço mudarem?
            </h2>
            <p className="text-sm text-ink-2">
              Lucro total de <strong>{foco.nome || "cenário em edição"}</strong> variando produtividade (colunas) e preço (linhas).
            </p>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Preço \ Produtividade</th>
                  {VARIACOES_PRODUTIVIDADE.map((v) => (
                    <th key={v} className="num">
                      {v > 0 ? `+${v}` : v}%
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matriz.map((linha, i) => (
                  <tr key={VARIACOES_PRECO[i]}>
                    <td className="font-semibold text-ink">
                      {VARIACOES_PRECO[i] > 0 ? `+${VARIACOES_PRECO[i]}` : VARIACOES_PRECO[i]}%
                    </td>
                    {linha.map((cel) => (
                      <td
                        key={cel.produtividade}
                        className={`num ${cel.produtividade === 0 && cel.preco === 0 ? "font-bold" : ""} ${
                          cel.lucro < 0 ? "bg-danger-soft text-danger-strong" : "bg-accent-soft/60 text-accent-strong"
                        }`}
                      >
                        {fmtMoney(cel.lucro)}
                      </td>
                    ))}
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
