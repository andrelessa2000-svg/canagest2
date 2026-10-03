"use client";

import {
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useActionState } from "react";
import { CircleCheck, Info, PencilLine, TriangleAlert } from "lucide-react";
import { fmtCount, fmtMoney, fmtMoneyPorKgAtr, fmtToneladas, parseDecimal } from "@/lib/format";
import { MESES, deslocarMes } from "@/lib/historico-preco";
import { salvarAtrMes, type ActionState } from "@/lib/actions";
import {
  agruparPorMoinada,
  compararAtrReal,
  mesesComAtr,
  proximoMesAtr,
  rotuloMes,
  serieAtrComparativo,
  type ColheitaComReceita,
  type MesAtr,
} from "@/lib/simulador-atr-comparacao";
import { Abas } from "./abas";
import { Campo } from "./forms";
import { CelulaMetrica } from "./stat-cells";

const EIXO = { tick: { fontSize: 11, fill: "var(--ink-3)" }, tickLine: false, axisLine: false } as const;
const MARGEM = { top: 8, right: 58, bottom: 0, left: 8 };

const COR_REAL = "var(--success)";

const semInscritos = () => () => {};
const montadoNoCliente = () => true;
const desmontadoNoServidor = () => false;

function useMontado() {
  return useSyncExternalStore(semInscritos, montadoNoCliente, desmontadoNoServidor);
}

/**
 * Selo de origem. A cor sozinha nunca carrega o significado: o selo sempre
 * mostra ícone + texto.
 */
function Selo({ tipo }: { tipo: "real" | "simulacao" }) {
  const real = tipo === "real";
  const Icone = real ? CircleCheck : PencilLine;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-bold whitespace-nowrap ${
        real ? "bg-success-soft text-success-strong" : "bg-warning-soft text-warning-strong"
      }`}
    >
      <Icone className="size-3" aria-hidden="true" />
      {real ? "REAL" : "SIMULA�!ÒO"}
    </span>
  );
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

function Vazio({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-1 rounded-md border border-line bg-surface-muted p-4 text-sm text-ink-2">
      {children}
    </div>
  );
}

/* ============================================================
   Editor dos meses � cadastre a safra mês a mês
   ============================================================ */

type LinhaMes = { ano: number; mes: number; rotulo: string; atr: string };

function linhaMes(m: MesAtr): LinhaMes {
  return { ano: m.ano, mes: m.mes, rotulo: `${MESES[m.mes - 1]}/${String(m.ano).slice(2)}`, atr: String(m.precoKgAtr) };
}

function FormAtrMes({
  ano,
  mes,
  rotulo,
  inicial,
  editavel = false,
}: {
  ano: number;
  mes: number;
  rotulo: string;
  inicial: string;
  editavel?: boolean;
}) {
  const [state, acao] = useActionState<ActionState | undefined, FormData>(salvarAtrMes, undefined);
  const [texto, setTexto] = useState(inicial);
  const [mesSel, setMesSel] = useState(mes);
  const [anoSel, setAnoSel] = useState(ano);
  const haValor = inicial.trim() !== "";

  const rotuloSel = `${MESES[mesSel - 1]}/${String(anoSel).slice(2)}`;
  const anos = [anoSel - 1, anoSel, anoSel + 1];

  return (
    <form action={acao} className="grid gap-1 rounded-[10px] border border-line bg-surface p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {editavel ? (
          <>
            <select
              name="mes"
              className="field-input !min-h-9 !px-2 text-sm"
              value={mesSel}
              onChange={(e) => setMesSel(Number(e.target.value))}
              aria-label="Mês"
            >
              {MESES.map((nome, i) => (
                <option key={nome} value={i + 1}>
                  {nome}
                </option>
              ))}
            </select>
            <select
              name="ano"
              className="field-input !min-h-9 !px-2 text-sm"
              value={anoSel}
              onChange={(e) => setAnoSel(Number(e.target.value))}
              aria-label="Ano"
            >
              {anos.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </>
        ) : (
          <>
            <input type="hidden" name="ano" value={ano} />
            <input type="hidden" name="mes" value={mes} />
            <p className="text-xs font-semibold text-ink">{rotulo}</p>
          </>
        )}
      </div>
      {editavel && <p className="text-xs font-semibold text-ink">{rotuloSel}</p>}
      <div className="grid gap-1.5">
        <Campo label="ATR (R$/kg)" htmlFor={`atr-${anoSel}-${mesSel}`} hint="por kg de ATR">
          <input
            id={`atr-${anoSel}-${mesSel}`}
            name="precoKgAtr"
            className="field-input tnum"
            inputMode="decimal"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="ex.: 1,2784"
          />
        </Campo>
        <button type="submit" className="btn btn-secondary w-full">
          {haValor ? "Atualizar" : "Salvar"}
        </button>
      </div>
      {state && !state.ok ? (
        <p className="text-xs text-danger">{state.error}</p>
      ) : state?.ok ? (
        <p className="text-xs text-success-strong">Salvo.</p>
      ) : null}
    </form>
  );
}

function EditorMeses({ meses }: { meses: MesAtr[] }) {
  const ordenados = mesesComAtr(meses);

  // Começa no mês atual, a menos que já haja meses cadastrados (continua do último).
  const hoje = new Date();
  const inicio =
    ordenados.length > 0
      ? ordenados[ordenados.length - 1]
      : { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 };

  // Meses adicionados com o botão "+ Adicionar" (ainda não salvos).
  const [adicionados, setAdicionados] = useState<{ ano: number; mes: number }[]>([]);

  function adicionar() {
    const ultimo =
      adicionados.length > 0
        ? adicionados[adicionados.length - 1]
        : { ano: inicio.ano, mes: inicio.mes };
    const prox = deslocarMes(ultimo.ano, ultimo.mes, 1);
    setAdicionados((prev) => [...prev, prox]);
  }

  function remover(idx: number) {
    setAdicionados((prev) => prev.filter((_, i) => i !== idx));
  }

  const rotulo = (ano: number, mes: number) => `${MESES[mes - 1]}/${String(ano).slice(2)}`;

  return (
    <div className="grid gap-4">
      {ordenados.length === 0 && (
        <p className="rounded-md border border-line bg-surface-muted p-3 text-sm text-ink-2">
          Comece informando o <strong>primeiro mês da safra</strong> � ex.: Agosto/26 � e o ATR que a
          usina anunciou. Depois use o botão <strong>+ Adicionar</strong> para o mês seguinte.
        </p>
      )}

      {/* Meses já cadastrados */}
      {ordenados.length > 0 && (
        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ordenados.map((m) => (
            <li key={`${m.ano}-${m.mes}`}>
              <FormAtrMes ano={m.ano} mes={m.mes} rotulo={linhaMes(m).rotulo} inicial={String(m.precoKgAtr)} />
            </li>
          ))}
          {adicionados.map((a, i) => (
            <li key={`novo-${a.ano}-${a.mes}`} className="relative">
              <FormAtrMes ano={a.ano} mes={a.mes} rotulo={rotulo(a.ano, a.mes)} inicial="" editavel />
              <button
                type="button"
                onClick={() => remover(i)}
                className="absolute right-2 top-2 text-xs text-ink-3 hover:text-danger"
                aria-label={`Remover ${rotulo(a.ano, a.mes)}`}
              >
                �
              </button>
            </li>
          ))}
        </ol>
      )}

      {/* Sem nenhum mês ainda: mostra o primeiro campo com mês/ano escolhíveis */}
      {ordenados.length === 0 && (
        <div className="grid grid-cols-1 gap-3 sm:max-w-xs">
          <div className="relative">
            <FormAtrMes ano={inicio.ano} mes={inicio.mes} rotulo={rotulo(inicio.ano, inicio.mes)} inicial="" editavel />
          </div>
          {adicionados.map((a, i) => (
            <div key={`novo-${a.ano}-${a.mes}`} className="relative">
              <FormAtrMes ano={a.ano} mes={a.mes} rotulo={rotulo(a.ano, a.mes)} inicial="" editavel />
              <button
                type="button"
                onClick={() => remover(i)}
                className="absolute right-2 top-2 text-xs text-ink-3 hover:text-danger"
                aria-label={`Remover ${rotulo(a.ano, a.mes)}`}
              >
                �
              </button>
            </div>
          ))}
        </div>
      )}

      <div>
        <button type="button" onClick={adicionar} className="btn btn-ghost">
          + Adicionar próximo mês
        </button>
        <p className="mt-1 text-xs text-ink-3">
          Clica em &quot;+ Adicionar&quot; para registrar o ATR do mês seguinte.
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   Aba 1 � Comparativo real
   ============================================================ */

function AbaReal({ meses, colheitas }: { meses: MesAtr[]; colheitas: ColheitaComReceita[] }) {
  const grupos = useMemo(() => agruparPorMoinada(colheitas), [colheitas]);
  const ordenados = mesesComAtr(meses);

  // Simulação: o usuário escolhe um mês ainda não anunciado e digita um ATR fictício.
  const [simular, setSimular] = useState(false);
  const proximo = useMemo(() => proximoMesAtr(meses), [meses]);
  const [simAno, setSimAno] = useState(proximo?.ano ?? new Date().getFullYear());
  const [simMes, setSimMes] = useState(proximo?.mes ?? new Date().getMonth() + 1);
  const [simTexto, setSimTexto] = useState("");
  const simAtr = parseDecimal(simTexto);

  // Meses efetivos = reais + simulado (se preenchido).
  const simuladoValido = simular && Number.isFinite(simAtr) && simAtr > 0 && !ordenados.some((m) => m.ano === simAno && m.mes === simMes);
  const mesesEfetivos = useMemo(() => {
    if (!simuladoValido) return ordenados;
    return [...ordenados, { ano: simAno, mes: simMes, precoKgAtr: simAtr }];
  }, [ordenados, simuladoValido, simAno, simMes, simAtr]);

  const serie = useMemo(() => serieAtrComparativo(grupos, mesesEfetivos), [grupos, mesesEfetivos]);
  const comparacoes = useMemo(
    () => grupos.map((g) => ({ g, c: compararAtrReal(g, mesesEfetivos) })),
    [grupos, mesesEfetivos],
  );

  const semAtr = comparacoes.filter((x) => x.c.semAtrNoMesReal);

  if (ordenados.length === 0) {
    return (
      <Vazio>
        Cadastre o ATR de pelo menos um mês para montar o comparativo. Use o campo acima.
      </Vazio>
    );
  }

  if (grupos.length === 0) {
    return (
      <Vazio>
        Você ainda não tem colheitas reais registradas. O comparativo mostra o que a cana já colhida
        teria rendido em cada mês.
      </Vazio>
    );
  }

  const maior = comparacoes.reduce((a, b) => (b.c.melhor && (!a.c.melhor || b.c.melhor.valor > a.c.melhor.valor) ? b : a));
  const perdaTotal = comparacoes.reduce((s, x) => s + x.c.perdaVsMelhor, 0);
  const melhorAtr = ordenados.reduce((a, b) => (b.precoKgAtr > a.precoKgAtr ? b : a));

  // Rótulo do mês simulado para marcar a coluna/barra.
  const rotuloSim = simuladoValido ? rotuloMes(simAno, simMes) : null;
  const ehSimulado = (rotulo: string) => rotulo === rotuloSim;

  return (
    <div className="grid gap-5">
      <div className="metric-grid grid-cols-2 lg:grid-cols-4">
        <CelulaMetrica rotulo="Meses com ATR" valor={fmtCount(ordenados.length)} legenda={`${fmtMoneyPorKgAtr(melhorAtr.precoKgAtr)} no melhor mês`} />
        <CelulaMetrica rotulo="Fazendas moídas" valor={fmtCount(grupos.length)} legenda={`${fmtToneladas(grupos.reduce((s, g) => s + g.toneladas, 0))}`} />
        <CelulaMetrica rotulo="Melhor mês" valor={maior.c.melhor?.rotulo ?? "�"} legenda={maior.c.melhor ? fmtMoney(maior.c.melhor.valor) : "�"} />
        <CelulaMetrica rotulo="Perda vs. melhor mês" valor={fmtMoney(perdaTotal)} legenda="somando todas as fazendas" />
      </div>

      {/* Simulação de um mês ainda não anunciado */}
      <Moldura
        titulo="Simular um mês ainda não anunciado"
        descricao="Digite um ATR fictício para um mês futuro (ex.: o próximo mês) e veja no gráfico e na tabela o que a produção valeria. A coluna simulada fica marcada como SIMULA�!ÒO � nunca se mistura com os dados reais."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Mês a simular" htmlFor="atr-sim-mes">
            <select
              id="atr-sim-mes"
              className="field-input"
              value={`${simAno}-${simMes}`}
              onChange={(e) => {
                const [a, m] = e.target.value.split("-").map(Number);
                setSimAno(a);
                setSimMes(m);
              }}
            >
              {MESES.map((nome, i) => {
                const mes = i + 1;
                const jaExiste = ordenados.some((mm) => mm.ano === simAno && mm.mes === mes);
                return (
                  <option key={`${simAno}-${mes}`} value={`${simAno}-${mes}`} disabled={jaExiste}>
                    {nome}/{String(simAno).slice(2)}{jaExiste ? " (já cadastrado)" : ""}
                  </option>
                );
              })}
            </select>
          </Campo>
          <Campo
            label="ATR fictício (R$/kg)"
            htmlFor="atr-sim-valor"
            hint="Só para comparação � não é salvo no histórico."
          >
            <input
              id="atr-sim-valor"
              className="field-input tnum"
              inputMode="decimal"
              value={simTexto}
              onChange={(e) => setSimTexto(e.target.value)}
              placeholder="ex.: 1,2681"
            />
          </Campo>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSimular((v) => !v)}
            className="btn btn-secondary"
          >
            {simular ? "Ocultar simulação" : "Mostrar simulação"}
          </button>
          {simuladoValido && (
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-2">
              <Selo tipo="simulacao" /> coluna {rotuloSim} é uma hipótese.
            </span>
          )}
        </div>
      </Moldura>

      <Moldura
        titulo="O que sua cana valeria em cada mês"
        descricao="Cada barra é a produção já colhida reavaliada pelo ATR daquele mês. A barra destacada é o mês em que a moagem realmente aconteceu; a barra tracejada é a simulação."
      >
        <AreaGrafico>
          <ComposedChart data={serie} margin={MARGEM}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <XAxis dataKey="rotulo" {...EIXO} />
            <YAxis {...EIXO} width={68} tickFormatter={(v: unknown) => fmtMoney(Number(v))} />
            <YAxis
              {...EIXO}
              yAxisId="atr"
              orientation="right"
              width={52}
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v: unknown) => fmtMoneyPorKgAtr(Number(v))}
            />
            <Tooltip
              formatter={(v: unknown, nome: unknown, item: { payload?: { ehReal?: boolean; rotulo?: string } }) => [
                nome === "atr" ? fmtMoneyPorKgAtr(Number(v)) : fmtMoney(Number(v)),
                nome === "atr"
                  ? "ATR do mês"
                  : item?.payload?.ehReal
                    ? "recebido (mês real)"
                    : ehSimulado(item?.payload?.rotulo ?? "")
                      ? "SIMULA�!ÒO (hipótese)"
                      : "hipótese do mês",
              ]}
              contentStyle={{ borderRadius: 10, border: "1px solid var(--line)", fontSize: 12 }}
            />
            <Bar dataKey="valor" name="Valor bruto" radius={[4, 4, 0, 0]} maxBarSize={64} isAnimationActive={false}>
              {serie.map((s) => (
                <Cell
                  key={s.rotulo}
                  fill={s.ehReal ? COR_REAL : ehSimulado(s.rotulo) ? "var(--warning)" : "var(--line-strong)"}
                  opacity={ehSimulado(s.rotulo) ? 0.6 : 1}
                />
              ))}
            </Bar>
            <Line
              type="monotone"
              dataKey="atr"
              yAxisId="atr"
              name="atr"
              stroke="var(--info)"
              strokeWidth={2}
              dot={{ r: 3 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </AreaGrafico>
        <ul className="flex flex-wrap items-center gap-4 text-xs text-ink-2">
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm" style={{ background: COR_REAL }} aria-hidden="true" /> Mês real da moagem
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm" style={{ background: "var(--line-strong)" }} aria-hidden="true" /> Outro mês real
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm opacity-60" style={{ background: "var(--warning)" }} aria-hidden="true" /> Simulação
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded" style={{ background: "var(--info)" }} aria-hidden="true" /> ATR (R$/kg)
          </li>
        </ul>
      </Moldura>

      {semAtr.length > 0 && (
        <div className="flex items-start gap-2 rounded-md bg-warning-soft p-3 text-sm text-warning-strong">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            {semAtr.length === 1 ? "Uma moagem ficou" : `${semAtr.length} moagens ficaram`} de fora: a usina
            ainda não anunciou o ATR do mês em que a fazenda moeu. Sem essa base não dá para reavaliar.
          </p>
        </div>
      )}

      <Moldura
        titulo="Fazenda por fazenda"
        descricao="O valor bruto que cada fazenda recebeu, e o que ela teria recebido se o ATR do mês fosse outro."
      >
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Fazenda</th>
                <th scope="col">Mês da moagem</th>
                <th scope="col" className="text-right">Toneladas</th>
                <th scope="col" className="text-right">Recebido</th>
                {mesesEfetivos.length > 0 && (
                  <>
                    {mesesEfetivos.map((m) => (
                      <th key={`${m.ano}-${m.mes}`} scope="col" className="text-right">
                        {ehSimulado(rotuloMes(m.ano, m.mes)) ? (
                          <span className="inline-flex flex-col items-end gap-1">
                            {`Se ${rotuloMes(m.ano, m.mes)}`}
                            <Selo tipo="simulacao" />
                          </span>
                        ) : (
                          `Se ${rotuloMes(m.ano, m.mes)}`
                        )}
                      </th>
                    ))}
                    <th scope="col" className="text-right">Perda vs. melhor</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {comparacoes.map(({ g, c }) => (
                <tr key={g.id}>
                  <th scope="row" className="font-medium">
                    {g.fazendaNome}
                    {g.qtdColheitas > 1 && (
                      <span className="ml-1 text-xs font-normal text-ink-3">({g.qtdColheitas} colheitas)</span>
                    )}
                  </th>
                  <td>
                    <span className="inline-flex items-center gap-1.5">
                      {g.rotulo}
                      {ordenados.some((m) => m.ano === g.ano && m.mes === g.mes) && <Selo tipo="real" />}
                    </span>
                  </td>
                  <td className="tnum text-right">{fmtToneladas(g.toneladas)}</td>
                  <td className="tnum text-right font-semibold">{fmtMoney(g.receitaReal)}</td>
                  {mesesEfetivos.map((m) => {
                    const linha = c.linhas.find((l) => l.ano === m.ano && l.mes === m.mes);
                    if (!linha) return <td key={`${m.ano}-${m.mes}`} className="tnum text-right">�</td>;
                    const sim = ehSimulado(rotuloMes(m.ano, m.mes));
                    return (
                      <td
                        key={`${m.ano}-${m.mes}`}
                        className={`tnum text-right ${linha.ehReal ? "font-semibold text-success-strong" : sim ? "font-semibold text-warning-strong" : linha.diferenca < 0 ? "text-ink-3" : "text-ink-2"}`}
                      >
                        {c.semAtrNoMesReal ? "�" : fmtMoney(linha.valor)}
                        {linha.ehReal && <span className="block text-[0.6875rem] font-normal">recebido</span>}
                        {sim && <span className="block text-[0.6875rem] font-normal">simulação</span>}
                      </td>
                    );
                  })}
                  {mesesEfetivos.length > 0 && (
                    <td className="tnum text-right">{c.perdaVsMelhor > 0 ? fmtMoney(c.perdaVsMelhor) : "�"}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Moldura>
    </div>
  );
}
/* ============================================================
   Tela
   ============================================================ */

export type PropsAtr = {
  meses: MesAtr[];
  colheitas: ColheitaComReceita[];
};

export default function SimuladorAtrComparacaoClient({ meses, colheitas }: PropsAtr) {
  const [filtroFazenda, setFiltroFazenda] = useState("");

  const fazendas = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const c of colheitas) mapa.set(c.fazendaId, c.fazendaNome);
    return [...mapa.entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [colheitas]);

  const colheitasFiltradas = useMemo(
    () => (filtroFazenda ? colheitas.filter((c) => c.fazendaId === filtroFazenda) : colheitas),
    [colheitas, filtroFazenda],
  );

  return (
    <div className="grid gap-5">
      <Moldura
        titulo="Meses da safra � ATR anunciado pela usina"
        descricao="Informe o ATR de cada mês, um por vez. O comparativo abaixo se monta sozinho a partir daqui."
      >
        <EditorMeses meses={meses} />
      </Moldura>

      {fazendas.length > 1 && (
        <div className="grid grid-cols-1 gap-2 sm:max-w-xs">
          <Campo label="Fazenda" htmlFor="atr-filtro-fazenda">
            <select
              id="atr-filtro-fazenda"
              className="field-input"
              value={filtroFazenda}
              onChange={(e) => setFiltroFazenda(e.target.value)}
            >
              <option value="">Todas as fazendas</option>
              {fazendas.map(([id, nome]) => (
                <option key={id} value={id}>{nome}</option>
              ))}
            </select>
          </Campo>
        </div>
      )}

      <Abas
        rotulo="Comparativo de ATR"
        itens={[
          {
            id: "real",
            rotulo: "Comparativo real",
            conteudo: <AbaReal meses={meses} colheitas={colheitasFiltradas} />,
          },
        ]}
      />

      <p className="flex items-start gap-2 text-xs text-ink-2">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        O comparativo reavalia o valor bruto que você já recebeu pela proporção do ATR de cada mês. Ele não
        substitui o fechamento da usina.
      </p>
    </div>
  );
}
