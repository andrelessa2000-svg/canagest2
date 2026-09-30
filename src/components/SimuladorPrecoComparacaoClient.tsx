"use client";

import { useMemo, useState, useSyncExternalStore, type ReactElement, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Link from "next/link";
import { CircleCheck, Info, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { fmtCount, fmtMoney, fmtToneladas, parseDecimal } from "@/lib/format";
import { rotulo, type PrecoMes } from "@/lib/historico-preco";
import {
  COR_ORIGEM,
  compararAtrPreco,
  compararProducaoNosMeses,
  extremosComparacao,
  filtrarColheitas,
  gerarVariacoesPreco,
  precoBaseSugerido,
  serieAtrPreco,
  seriePrecoMensal,
  serieValorProducao,
  serieVariacoes,
  simularCenarioPreco,
  type ColheitaReal,
  type ComparacaoProducao,
  type FiltroComparacao,
  type LinhaVariacao,
  type OpcoesComparacaoFiltros,
} from "@/lib/simulador-preco-comparacao";
import { Abas, LegendaOrigens, SeloOrigem } from "./abas";
import { Campo } from "./forms";
import { CelulaMetrica } from "./stat-cells";

const TODAS = "__todas__";
const SEM_SAFRA = "__sem_safra__";

const EIXO = { tick: { fontSize: 11, fill: "var(--ink-3)" }, tickLine: false, axisLine: false } as const;
const MARGEM = { top: 8, right: 8, bottom: 0, left: 8 };

const pct1 = (n: number | null) =>
  n === null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(1).replace(".", ",")}%`;
const porTonelada = (n: number | null) => (n === null ? "—" : `${fmtMoney(n)}/t`);

/** Deixa explícito quando o ágio contratado entra no valor do mês. */
const legendaPrecoReal = (preco: number | null, c: ColheitaReal | null) => {
  if (preco === null) return "—";
  const agio = c?.usinaModelo === "pindorama" ? (c.agio ?? 0) : 0;
  return agio !== 0 ? `${porTonelada(preco)} + ágio de ${fmtMoney(agio)}/t` : porTonelada(preco);
};

const semInscritos = () => () => {};
const montadoNoCliente = () => true;
const desmontadoNoServidor = () => false;

/**
 * O Recharts mede o container para desenhar e, no servidor, não há largura.
 * `useSyncExternalStore` responde "já estou no cliente?" sem setState dentro de
 * effect — é o mesmo padrão usado pelo simulador de decisão.
 */
function useMontado() {
  return useSyncExternalStore(semInscritos, montadoNoCliente, desmontadoNoServidor);
}

function Moldura({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao: string;
  children: ReactNode;
}) {
  return (
    <section className="card grid grid-cols-1 gap-4 p-4 sm:p-6">
      <div className="grid grid-cols-1 gap-1">
        <h3 className="font-display text-lg text-ink">{titulo}</h3>
        <p className="text-sm text-ink-2">{descricao}</p>
      </div>
      {children}
    </section>
  );
}

function AreaGrafico({ children }: { children: ReactElement }) {
  const montado = useMontado();
  if (!montado) {
    return <div className="h-72 w-full rounded-md bg-surface-muted" aria-hidden="true" />;
  }
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

/* ============================================================
   Aba 1 — Comparação Real
   ============================================================ */

function TabelaComparacao({ comparacao }: { comparacao: ComparacaoProducao }) {
  const { maior, menor } = extremosComparacao(comparacao);

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Mês</th>
            <th>Origem</th>
            <th className="num">Preço/t</th>
            <th className="num">Valor estimado da produção</th>
            <th className="num">Diferença</th>
            <th className="num">Variação</th>
          </tr>
        </thead>
        <tbody>
          {comparacao.linhas.map((l) => (
            <tr key={`${l.ano}-${l.mes}`} className={l.ehMoagemReal ? "bg-success-soft/50" : undefined}>
              <td className="font-semibold text-ink">
                <span className="inline-flex items-center gap-2">
                  {l.rotulo}
                  {l.ehMoagemReal && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-success-soft px-1.5 py-0.5 text-[0.6875rem] font-bold whitespace-nowrap text-success-strong">
                      <CircleCheck className="size-3" aria-hidden="true" /> MOAGEM REAL
                    </span>
                  )}
                  {l.rotulo === maior?.rotulo && !l.ehMoagemReal && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-1.5 py-0.5 text-[0.6875rem] font-bold text-accent-strong">
                      <TrendingUp className="size-3" aria-hidden="true" /> Melhor
                    </span>
                  )}
                  {l.rotulo === menor?.rotulo && !l.ehMoagemReal && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-surface-muted px-1.5 py-0.5 text-[0.6875rem] font-bold text-ink-2">
                      <TrendingDown className="size-3" aria-hidden="true" /> Menor
                    </span>
                  )}
                </span>
              </td>
              <td>{l.origem ? <SeloOrigem origem={l.origem} /> : <span className="text-ink-3">sem preço</span>}</td>
              <td className="num">{porTonelada(l.preco)}</td>
              <td className="num font-semibold text-ink">{l.valor === null ? "—" : fmtMoney(l.valor)}</td>
              <td
                className={`num ${
                  l.diferencaValor === null
                    ? "text-ink-3"
                    : l.diferencaValor < 0
                      ? "text-danger-strong"
                      : "text-success-strong"
                }`}
              >
                {l.diferencaValor === null ? "—" : `${l.diferencaValor > 0 ? "+" : ""}${fmtMoney(l.diferencaValor)}`}
              </td>
              <td className="num">{pct1(l.variacaoPct)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3}>Mês real de moagem — {comparacao.rotuloReal}</td>
            <td className="num">{comparacao.valorMesReal === null ? "—" : fmtMoney(comparacao.valorMesReal)}</td>
            <td className="num">referência</td>
            <td className="num">0,0%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function AbaComparacaoReal({
  colheitas,
  precos,
}: {
  colheitas: ColheitaReal[];
  precos: PrecoMes[];
}) {
  const [selecionadaId, setSelecionadaId] = useState("");
  const [mesesProjecao, setMesesProjecao] = useState(3);

  const selecionada = useMemo(
    () => colheitas.find((c) => c.id === selecionadaId) ?? colheitas[0] ?? null,
    [colheitas, selecionadaId],
  );

  const comparacao = useMemo(
    () =>
      selecionada
        ? compararProducaoNosMeses(
            {
              toneladas: selecionada.toneladas,
              ano: selecionada.anoMoagem,
              mes: selecionada.mesMoagem,
              modelo: selecionada.usinaModelo,
              agio: selecionada.agio,
            },
            precos,
            { mesesProjecao },
          )
        : null,
    [selecionada, precos, mesesProjecao],
  );

  const seriePreco = useMemo(() => (comparacao ? seriePrecoMensal(comparacao) : []), [comparacao]);
  const serieValor = useMemo(() => (comparacao ? serieValorProducao(comparacao) : []), [comparacao]);

  const serieAtr = useMemo(
    () =>
      serieAtrPreco(
        precos,
        selecionada ? { ano: selecionada.anoMoagem, mes: selecionada.mesMoagem } : undefined,
      ),
    [precos, selecionada],
  );
  const temAtr = useMemo(() => serieAtr.some((p) => p.atr !== null), [serieAtr]);
  const resumoAtr = useMemo(() => compararAtrPreco(precos), [precos]);

  const celulasBarra = useMemo(
    () => serieValor.map((d) => (d.ehMoagemReal ? COR_ORIGEM.real : d.origem ? COR_ORIGEM[d.origem] : "var(--line-strong)")),
    [serieValor],
  );

  if (colheitas.length === 0) {
    return (
      <div className="card flex items-start gap-3 p-4 text-sm text-ink-2">
        <Info className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden="true" />
        <p>
          Nenhuma colheita real (sem projeção) bate com estes filtros. Ajuste safra, fazenda, usina ou período para
          ver a comparação.
        </p>
      </div>
    );
  }

  const semPreco = precos.length === 0;

  return (
    <div className="grid grid-cols-1 gap-6">
      {selecionada && (
        <div className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Campo label="Colheita (toneladas reais)" htmlFor="pc-colheita">
              <select
                id="pc-colheita"
                className="field-input"
                value={selecionada.id}
                onChange={(e) => setSelecionadaId(e.target.value)}
              >
                {colheitas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fazendaNome} · {fmtCount(c.toneladas)} t · {rotulo(c.anoMoagem, c.mesMoagem)}
                    {c.safra ? ` · ${c.safra}` : ""}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Meses projetados à frente" htmlFor="pc-projecao" hint="Estimativa futura por média móvel">
              <select
                id="pc-projecao"
                className="field-input"
                value={mesesProjecao}
                onChange={(e) => setMesesProjecao(Number(e.target.value))}
              >
                {[0, 1, 2, 3, 6, 12].map((n) => (
                  <option key={n} value={n}>
                    {n === 0 ? "Somente meses com preço" : `${n} ${n === 1 ? "mês" : "meses"}`}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          <div className="metric-grid grid-cols-2 lg:grid-cols-4">
            <CelulaMetrica rotulo="Produção real" valor={fmtToneladas(selecionada.toneladas)} legenda={`${selecionada.fazendaNome} · ${selecionada.usinaNome}`} />
            <CelulaMetrica rotulo="Mês da moagem" valor={comparacao?.rotuloReal ?? "—"} legenda={selecionada.safra ?? "sem safra"} destaque />
            <CelulaMetrica
              rotulo="Valor oficial do mês real"
              valor={comparacao?.valorMesReal === null || comparacao?.valorMesReal === undefined ? "—" : fmtMoney(comparacao.valorMesReal)}
              legenda={legendaPrecoReal(comparacao?.precoMesReal ?? null, selecionada)}
            />
            <CelulaMetrica
              rotulo="Meses na comparação"
              valor={fmtCount(comparacao?.mesesComValor ?? 0)}
              legenda={
                precos.length === 1 ? "1 preço cadastrado" : `${fmtCount(precos.length)} preços cadastrados`
              }
            />
          </div>
        </div>
      )}

      {semPreco ? (
        <div className="card grid gap-4 p-4 sm:p-6">
          <div className="flex items-start gap-3 text-sm text-ink-2">
            <Info className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden="true" />
            <p>
              Você ainda não cadastrou preço da cana por mês. Registre os valores oficiais para comparar o valor da
              produção em cada mês. Enquanto isso, use as abas <strong>Cenário de preço</strong> e{" "}
              <strong>Alta e baixa</strong> para simular hipóteses.
            </p>
          </div>
          <div>
            <Link href="/historico-preco" className="btn btn-secondary">
              <Plus className="size-4" aria-hidden="true" /> Registrar preços oficiais
            </Link>
          </div>
        </div>
      ) : (
        comparacao && (
          <>
            <Moldura
              titulo="Valor estimado da produção por mês"
              descricao={`${fmtToneladas(comparacao.toneladas)} avaliadas pelo preço de cada mês. A linha destacada é o mês real de moagem (${comparacao.rotuloReal}).`}
            >
              <AreaGrafico>
                <BarChart data={serieValor} margin={MARGEM}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                  <XAxis dataKey="rotulo" {...EIXO} />
                  <YAxis {...EIXO} width={62} tickFormatter={(v: unknown) => fmtMoney(Number(v))} />
                  <Tooltip
                    formatter={(v: unknown) => fmtMoney(Number(v))}
                    cursor={{ fill: "var(--surface-muted)" }}
                    contentStyle={{ borderRadius: 10, border: "1px solid var(--line)", fontSize: 12 }}
                  />
                  <Bar dataKey="valor" name="Valor estimado" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                    {celulasBarra.map((cor, i) => (
                      <Cell key={serieValor[i].rotulo} fill={cor} />
                    ))}
                  </Bar>
                </BarChart>
              </AreaGrafico>
              <LegendaOrigens />
            </Moldura>

            <Moldura
              titulo="Preço da cana por mês"
              descricao="Preço oficial cadastrado em cada mês. Meses sem registro e meses projetados aparecem como estimativas."
            >
              <AreaGrafico>
                <LineChart data={seriePreco} margin={MARGEM}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                  <XAxis dataKey="rotulo" {...EIXO} />
                  <YAxis {...EIXO} width={56} tickFormatter={(v: unknown) => fmtMoney(Number(v))} domain={["auto", "auto"]} />
                  <Tooltip
                    formatter={(v: unknown) => (v === null ? "—" : `${fmtMoney(Number(v))}/t`)}
                    contentStyle={{ borderRadius: 10, border: "1px solid var(--line)", fontSize: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="precoOficial"
                    name="Preço oficial"
                    stroke={COR_ORIGEM.real}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: COR_ORIGEM.real }}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="precoProjetado"
                    name="Projeção"
                    stroke={COR_ORIGEM.projecao}
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 3, fill: COR_ORIGEM.projecao }}
                    connectNulls
                    isAnimationActive={false}
                  />
                </LineChart>
              </AreaGrafico>
            </Moldura>

            {temAtr && (
              <Moldura
                titulo="ATR x preço por mês"
                descricao={
                  resumoAtr.mesesComAtr > 1
                    ? `Eixo esquerdo: qualidade da cana (kg ATR/t). Eixo direito: remuneração (R$/t). No período o ATR variou ${pct1(
                        resumoAtr.variacaoAtr,
                      )} e o preço ${pct1(resumoAtr.variacaoPreco)}.` +
                      (resumoAtr.mesesContrarios > 0
                        ? ` Em ${fmtCount(resumoAtr.mesesContrarios)} ${
                            resumoAtr.mesesContrarios === 1 ? "mês" : "meses"
                          } o ATR e o preço andaram em sentidos opostos.`
                        : "")
                    : "Eixo esquerdo: qualidade da cana (kg ATR/t). Eixo direito: remuneração (R$/t). Cadastre ATR em mais meses para comparar."
                }
              >
                <AreaGrafico>
                  <LineChart data={serieAtr} margin={MARGEM}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                    <XAxis dataKey="rotulo" {...EIXO} />
                    <YAxis
                      yAxisId="atr"
                      {...EIXO}
                      width={56}
                      tickFormatter={(v: unknown) => fmtMoney(Number(v))}
                    />
                    <YAxis
                      yAxisId="preco"
                      orientation="right"
                      {...EIXO}
                      width={62}
                      tickFormatter={(v: unknown) => fmtMoney(Number(v))}
                    />
                    <Tooltip
                      formatter={(v: unknown, nome?: unknown) =>
                        nome === "ATR (kg/t)"
                          ? `${fmtMoney(Number(v))} kg/t`
                          : `${fmtMoney(Number(v))}/t`
                      }
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid var(--line)",
                        fontSize: 12,
                      }}
                    />
                    <Line
                      yAxisId="atr"
                      type="monotone"
                      dataKey="atr"
                      name="ATR (kg/t)"
                      stroke="var(--info)"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "var(--info)" }}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                    <Line
                      yAxisId="preco"
                      type="monotone"
                      dataKey="preco"
                      name="Preço (R$/t)"
                      stroke={COR_ORIGEM.real}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: COR_ORIGEM.real }}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </AreaGrafico>
              </Moldura>
            )}

            <div className="grid grid-cols-1 gap-3">
              <h3 className="font-display text-lg text-ink">Comparação mês a mês</h3>
              <p className="text-sm text-ink-2">
                Valor estimado da produção com o preço oficial de cada mês, medido contra o mês de
                moagem. Em Pindorama o valor soma o ágio contratado — a mesma regra usada no cálculo
                real da colheita. Nada aqui é gravado.
              </p>
              <TabelaComparacao comparacao={comparacao} />
            </div>
          </>
        )
      )}
    </div>
  );
}

/* ============================================================
   Aba 2 — Cenário de Preço
   ============================================================ */

function AbaCenarioPreco({
  precos,
  producaoPadrao,
}: {
  precos: PrecoMes[];
  producaoPadrao: { toneladas: number; custoPorTonelada: number };
}) {
  const [precoTexto, setPrecoTexto] = useState(() => precoBaseSugerido(precos).toFixed(2).replace(".", ","));
  const [tonTexto, setTonTexto] = useState(fm1(producaoPadrao.toneladas));
  const [custoTexto, setCustoTexto] = useState(fm1(producaoPadrao.custoPorTonelada));

  const preco = Math.max(nDe(precoTexto), 0);
  const toneladas = Math.max(nDe(tonTexto), 0);
  const custo = Math.max(nDe(custoTexto), 0);

  const resultado = simularCenarioPreco({ preco, toneladas, custoPorTonelada: custo, origem: "simulacao" });
  const ultimoOficial = [...precos].sort((a, b) => a.ano - b.ano || a.mes - b.mes).at(-1);
  const variacaoVsOficial =
    ultimoOficial && ultimoOficial.precoMedio > 0
      ? ((preco - ultimoOficial.precoMedio) / ultimoOficial.precoMedio) * 100
      : null;

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="card grid grid-cols-1 gap-5 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-1">
          <h3 className="font-display text-lg text-ink">Informe um preço hipotético</h3>
          <p className="text-sm text-ink-2">
            O preço digitado serve só para este cálculo. Ele não grava nada e não representa valor oficial.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Campo
            label="Preço simulado (R$/t)"
            htmlFor="pc-preco"
            hint={
              ultimoOficial
                ? `Último oficial: ${fmtMoney(ultimoOficial.precoMedio)}/t (${rotulo(ultimoOficial.ano, ultimoOficial.mes)})`
                : "Sem preço oficial cadastrado"
            }
          >
            <input
              id="pc-preco"
              className="field-input tnum"
              inputMode="decimal"
              value={precoTexto}
              onChange={(e) => setPrecoTexto(e.target.value)}
            />
          </Campo>
          <Campo label="Toneladas" htmlFor="pc-ton" hint="Produção considerada no cálculo">
            <input
              id="pc-ton"
              className="field-input tnum"
              inputMode="decimal"
              value={tonTexto}
              onChange={(e) => setTonTexto(e.target.value)}
            />
          </Campo>
          <Campo label="Custo por tonelada (R$/t)" htmlFor="pc-custo" hint="Opcional — 0 deixa o custo fora">
            <input
              id="pc-custo"
              className="field-input tnum"
              inputMode="decimal"
              value={custoTexto}
              onChange={(e) => setCustoTexto(e.target.value)}
            />
          </Campo>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <SeloOrigem origem="simulacao" />
          <p className="text-sm text-ink-2">Valor informado pelo usuário. Não representa valor oficial.</p>
        </div>
      </div>

      <div className="metric-grid grid-cols-2 lg:grid-cols-4">
        <CelulaMetrica rotulo="Preço simulado" valor={porTonelada(resultado.preco)} legenda={variacaoVsOficial === null ? "sem base oficial" : `${pct1(variacaoVsOficial)} vs. último oficial`} destaque />
        <CelulaMetrica rotulo="Receita bruta" valor={fmtMoney(resultado.receita)} legenda={`${fmtToneladas(resultado.toneladas)}`} />
        <CelulaMetrica
          rotulo="Custo total"
          valor={resultado.custoTotal === null ? "—" : fmtMoney(resultado.custoTotal)}
          legenda={resultado.custoTotal === null ? "custo não informado" : `${fmtMoney(custo)}/t`}
        />
        <CelulaMetrica
          rotulo="Valor líquido"
          valor={resultado.valorLiquido === null ? "—" : fmtMoney(resultado.valorLiquido)}
          legenda={resultado.valorLiquido === null ? "informe o custo" : resultado.valorLiquido >= 0 ? "acima do custo" : "abaixo do custo"}
        />
      </div>

      <div className="card flex items-start gap-3 p-4 text-sm text-ink-2">
        <Info className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden="true" />
        <p>
          Estes números são <strong>simulação</strong>: saem do preço que você digitou, não do histórico oficial. Para
          comparar com o que foi realmente pago, use a aba <strong>Comparação real</strong>.
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   Aba 3 — Alta e Baixa
   ============================================================ */

function fm1(n: number) {
  return n.toFixed(1).replace(".", ",");
}
function nDe(texto: string) {
  const n = parseDecimal(texto);
  return Number.isFinite(n) ? n : 0;
}

function AbaAltaBaixa({
  precos,
  producaoPadrao,
}: {
  precos: PrecoMes[];
  producaoPadrao: { toneladas: number; custoPorTonelada: number };
}) {
  const [variacaoAtiva, setVariacaoAtiva] = useState(0);
  const [baseTexto, setBaseTexto] = useState(() => precoBaseSugerido(precos).toFixed(2).replace(".", ","));
  const [tonTexto, setTonTexto] = useState(fm1(producaoPadrao.toneladas));

  const precoBase = Math.max(nDe(baseTexto), 0);
  const toneladas = Math.max(nDe(tonTexto), 0);

  const linhas = useMemo(
    () =>
      gerarVariacoesPreco(precoBase, toneladas, {
        custoPorTonelada: producaoPadrao.custoPorTonelada,
      }),
    [precoBase, toneladas, producaoPadrao.custoPorTonelada],
  );
  const serie = useMemo(() => serieVariacoes(linhas), [linhas]);
  const selecionada = linhas.find((l) => l.variacaoPct === variacaoAtiva) ?? linhas[0];

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="card grid grid-cols-1 gap-5 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-1">
          <h3 className="font-display text-lg text-ink">Preço-base e produção</h3>
          <p className="text-sm text-ink-2">
            A variação é aplicada sobre o preço-base. As demais colunas são hipóteses, não valores oficiais.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo
            label="Preço-base (R$/t)"
            htmlFor="pc-base"
            hint={
              precos.length > 0
                ? "Sugerido: último preço oficial cadastrado"
                : "Sem histórico — informe um preço de referência"
            }
          >
            <input
              id="pc-base"
              className="field-input tnum"
              inputMode="decimal"
              value={baseTexto}
              onChange={(e) => setBaseTexto(e.target.value)}
            />
          </Campo>
          <Campo label="Toneladas" htmlFor="pc-ab-ton">
            <input
              id="pc-ab-ton"
              className="field-input tnum"
              inputMode="decimal"
              value={tonTexto}
              onChange={(e) => setTonTexto(e.target.value)}
            />
          </Campo>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <p className="eyebrow">Variação rápida</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Variação de preço aplicada">
            {linhas.map((l) => (
              <button
                key={l.variacaoPct}
                type="button"
                aria-pressed={l.variacaoPct === variacaoAtiva}
                onClick={() => setVariacaoAtiva(l.variacaoPct)}
                className={`btn ${l.variacaoPct === variacaoAtiva ? "btn-soft" : "btn-secondary"} tnum`}
              >
                {l.variacaoPct === 0 ? "Atual" : l.rotulo}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="metric-grid grid-cols-2 lg:grid-cols-4">
        <CelulaMetrica rotulo="Variação escolhida" valor={selecionada.rotulo} legenda={`${porTonelada(selecionada.preco)}/t`} destaque />
        <CelulaMetrica rotulo="Receita bruta" valor={fmtMoney(selecionada.receita)} legenda={`${fmtToneladas(selecionada.toneladas)}`} />
        <CelulaMetrica
          rotulo="Diferença vs. preço-base"
          valor={`${selecionada.diferencaValor > 0 ? "+" : ""}${fmtMoney(selecionada.diferencaValor)}`}
          legenda="contra a variação 0%"
        />
        <CelulaMetrica
          rotulo="Valor líquido"
          valor={selecionada.valorLiquido === null ? "—" : fmtMoney(selecionada.valorLiquido)}
          legenda={producaoPadrao.custoPorTonelada > 0 ? `${fmtMoney(producaoPadrao.custoPorTonelada)}/t de custo` : "custo não informado"}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SeloOrigem origem="simulacao" />
        <p className="text-sm text-ink-2">Valor informado pelo usuário. Não representa valor oficial.</p>
      </div>

      <Moldura
        titulo="Cenário de alta e baixa"
        descricao={`Receita da mesma produção (${fmtToneladas(selecionada.toneladas)}) com o preço variando de −20% a +20%.`}
      >
        <AreaGrafico>
          <AreaChart data={serie} margin={MARGEM}>
            <defs>
              <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COR_ORIGEM.simulacao} stopOpacity={0.28} />
                <stop offset="95%" stopColor={COR_ORIGEM.simulacao} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <XAxis dataKey="rotulo" {...EIXO} />
            <YAxis {...EIXO} width={62} tickFormatter={(v: unknown) => fmtMoney(Number(v))} />
            <Tooltip
              formatter={(v: unknown) => fmtMoney(Number(v))}
              contentStyle={{ borderRadius: 10, border: "1px solid var(--line)", fontSize: 12 }}
            />
            <Area
              type="monotone"
              dataKey="receita"
              name="Receita bruta"
              stroke={COR_ORIGEM.simulacao}
              strokeWidth={2.5}
              fill="url(#gradReceita)"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="receita"
              name="Receita bruta"
              stroke={COR_ORIGEM.real}
              strokeWidth={2}
              dot={{ r: 3, fill: COR_ORIGEM.simulacao }}
              isAnimationActive={false}
            />
          </AreaChart>
        </AreaGrafico>
      </Moldura>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Variação</th>
              <th>Origem</th>
              <th className="num">Preço/t</th>
              <th className="num">Receita bruta</th>
              <th className="num">Diferença</th>
              <th className="num">Valor líquido</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <LinhaVariacaoTabela key={l.variacaoPct} linha={l} selecionada={l.variacaoPct === variacaoAtiva} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LinhaVariacaoTabela({ linha, selecionada }: { linha: LinhaVariacao; selecionada: boolean }) {
  return (
    <tr className={selecionada ? "bg-warning-soft/40" : undefined}>
      <td className="font-semibold text-ink tnum">{linha.rotulo}</td>
      <td>
        <SeloOrigem origem={linha.origem} />
      </td>
      <td className="num">{fmtMoney(linha.preco)}</td>
      <td className="num font-semibold text-ink">{fmtMoney(linha.receita)}</td>
      <td className={`num ${linha.diferencaValor < 0 ? "text-danger-strong" : linha.diferencaValor > 0 ? "text-success-strong" : "text-ink-3"}`}>
        {linha.diferencaValor === 0 ? "—" : `${linha.diferencaValor > 0 ? "+" : ""}${fmtMoney(linha.diferencaValor)}`}
      </td>
      <td className={`num ${linha.valorLiquido === null ? "text-ink-3" : linha.valorLiquido < 0 ? "text-danger-strong" : "text-ink"}`}>
        {linha.valorLiquido === null ? "—" : fmtMoney(linha.valorLiquido)}
      </td>
    </tr>
  );
}

/* ============================================================
   Filtros + shell
   ============================================================ */

function Filtros({
  opcoes,
  filtro,
  onChange,
}: {
  opcoes: OpcoesComparacaoFiltros;
  filtro: FiltroComparacao;
  onChange: (f: FiltroComparacao) => void;
}) {
  return (
    <section className="card grid grid-cols-1 gap-4 p-4 sm:p-6" aria-labelledby="pc-filtros">
      <h3 id="pc-filtros" className="font-display text-lg text-ink">
        Filtros
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Campo label="Safra" htmlFor="pc-safra">
          <select
            id="pc-safra"
            className="field-input"
            value={filtro.safra === undefined ? TODAS : filtro.safra === null ? SEM_SAFRA : filtro.safra}
            onChange={(e) =>
              onChange({
                ...filtro,
                safra: e.target.value === TODAS ? undefined : e.target.value === SEM_SAFRA ? null : e.target.value,
              })
            }
          >
            <option value={TODAS}>Todas as safras</option>
            <option value={SEM_SAFRA}>Sem safra</option>
            {opcoes.safras.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="Fazenda" htmlFor="pc-fazenda">
          <select
            id="pc-fazenda"
            className="field-input"
            value={filtro.fazendaId ?? TODAS}
            onChange={(e) => onChange({ ...filtro, fazendaId: e.target.value === TODAS ? undefined : e.target.value })}
          >
            <option value={TODAS}>Todas as fazendas</option>
            {opcoes.fazendas.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="Usina" htmlFor="pc-usina">
          <select
            id="pc-usina"
            className="field-input"
            value={filtro.usinaId ?? TODAS}
            onChange={(e) => onChange({ ...filtro, usinaId: e.target.value === TODAS ? undefined : e.target.value })}
          >
            <option value={TODAS}>Todas as usinas</option>
            {opcoes.usinas.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="Mês inicial" htmlFor="pc-de-mes" hint="Início do período de moagem">
          <input
            id="pc-de-mes"
            className="field-input"
            type="month"
            value={paraValorMes(filtro.periodo?.de ?? null)}
            onChange={(e) => onChange({ ...filtro, periodo: { de: deValorMes(e.target.value), ate: filtro.periodo?.ate ?? null } })}
          />
        </Campo>
        <Campo label="Mês final" htmlFor="pc-ate-mes" hint="Fim do período de moagem">
          <input
            id="pc-ate-mes"
            className="field-input"
            type="month"
            value={paraValorMes(filtro.periodo?.ate ?? null)}
            onChange={(e) => onChange({ ...filtro, periodo: { de: filtro.periodo?.de ?? null, ate: deValorMes(e.target.value) } })}
          />
        </Campo>
      </div>
    </section>
  );
}

function paraValorMes(v: { ano: number; mes: number } | null) {
  return v ? `${v.ano}-${String(v.mes).padStart(2, "0")}` : "";
}
function deValorMes(v: string): { ano: number; mes: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(v);
  return m ? { ano: Number(m[1]), mes: Number(m[2]) } : null;
}

/* ============================================================
   Componente exportado
   ============================================================ */

export function SimuladorPrecoComparacaoClient({
  colheitas,
  precos,
  opcoes,
}: {
  colheitas: ColheitaReal[];
  precos: PrecoMes[];
  opcoes: OpcoesComparacaoFiltros;
}) {
  const [filtro, setFiltro] = useState<FiltroComparacao>({});

  const filtradas = useMemo(() => filtrarColheitas(colheitas, filtro), [colheitas, filtro]);

  const producaoPadrao = useMemo(() => {
    const ton = filtradas.reduce((s, c) => s + c.toneladas, 0);
    const custoTotal = filtradas.reduce((s, c) => s + c.custoPorTonelada * c.toneladas, 0);
    return {
      toneladas: ton,
      custoPorTonelada: ton > 0 ? custoTotal / ton : 0,
    };
  }, [filtradas]);

  return (
    <div className="grid grid-cols-1 gap-6">
      <Filtros opcoes={opcoes} filtro={filtro} onChange={setFiltro} />

      <Abas
        rotulo="Simulação de preço da cana"
        itens={[
          {
            id: "comparacao",
            rotulo: "Comparação real",
            conteudo: <AbaComparacaoReal colheitas={filtradas} precos={precos} />,
          },
          {
            id: "cenario",
            rotulo: "Cenário de preço",
            conteudo: <AbaCenarioPreco precos={precos} producaoPadrao={producaoPadrao} />,
          },
          {
            id: "variacao",
            rotulo: "Alta e baixa",
            conteudo: <AbaAltaBaixa precos={precos} producaoPadrao={producaoPadrao} />,
          },
        ]}
      />
    </div>
  );
}