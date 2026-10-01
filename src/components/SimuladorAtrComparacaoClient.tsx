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
import { MESES } from "@/lib/historico-preco";
import { salvarAtrMes, type ActionState } from "@/lib/actions";
import {
  agruparPorMoinada,
  compararAtrReal,
  mesesComAtr,
  proximoMesAtr,
  serieAtrComparativo,
  simularProximoMes,
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

const sinal = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "");
const comSinal = (n: number) => `${sinal(n)}${fmtMoney(Math.abs(n))}`;

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
      {real ? "REAL" : "SIMULAÇÃO"}
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
   Editor dos meses — o produtor digita o ATR mês a mês
   ============================================================ */

type LinhaMes = { ano: number; mes: number; rotulo: string; atr: string };

function linhaMes(m: MesAtr): LinhaMes {
  return { ano: m.ano, mes: m.mes, rotulo: `${MESES[m.mes - 1]}/${String(m.ano).slice(2)}`, atr: String(m.precoKgAtr) };
}

function FormAtrMes({ ano, mes, rotulo, inicial }: { ano: number; mes: number; rotulo: string; inicial: string }) {
  const [state, acao] = useActionState<ActionState | undefined, FormData>(salvarAtrMes, undefined);
  const [texto, setTexto] = useState(inicial);

  return (
    <form action={acao} className="grid gap-1">
      <input type="hidden" name="ano" value={ano} />
      <input type="hidden" name="mes" value={mes} />
      <div className="flex items-end gap-2">
        <Campo label={`ATR de ${rotulo}`} htmlFor={`atr-${ano}-${mes}`} hint="R$ por kg de ATR">
          <input
            id={`atr-${ano}-${mes}`}
            name="precoKgAtr"
            className="field-input tnum"
            inputMode="decimal"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="ex.: 1,2784"
          />
        </Campo>
        <button type="submit" className="btn btn-secondary">
          Salvar
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

  if (ordenados.length === 0) {
    return (
      <Vazio>
        Nenhum mês cadastrado ainda. Informe abaixo o ATR anunciado pela usina para começar — o{" "}
        <strong>primeiro mês da safra</strong> e os seguintes, um por vez.
      </Vazio>
    );
  }

  return (
    <div className="grid gap-4">
      <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ordenados.map((m) => (
          <li key={`${m.ano}-${m.mes}`}>
            <FormAtrMes ano={m.ano} mes={m.mes} rotulo={linhaMes(m).rotulo} inicial={String(m.precoKgAtr)} />
          </li>
        ))}
      </ol>
      <FormAdicionarMes ultimo={ordenados[ordenados.length - 1]} />
    </div>
  );
}

function FormAdicionarMes({ ultimo }: { ultimo: MesAtr }) {
  const proximo = (() => {
    const total = ultimo.ano * 12 + (ultimo.mes - 1) + 1;
    const ano = Math.floor(total / 12);
    const mes = (total % 12) + 1;
    return { ano, mes, rotulo: `${MESES[mes - 1]}/${String(ano).slice(2)}` };
  })();

  return (
    <FormAtrMes ano={proximo.ano} mes={proximo.mes} rotulo={proximo.rotulo} inicial="" />
  );
}

/* ============================================================
   Aba 1 — Comparativo real
   ============================================================ */

function AbaReal({ meses, colheitas }: { meses: MesAtr[]; colheitas: ColheitaComReceita[] }) {
  const grupos = useMemo(() => agruparPorMoinada(colheitas), [colheitas]);
  const serie = useMemo(() => serieAtrComparativo(grupos, meses), [grupos, meses]);
  const comparacoes = useMemo(
    () => grupos.map((g) => ({ g, c: compararAtrReal(g, meses) })),
    [grupos, meses],
  );

  const ordenados = mesesComAtr(meses);
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

  return (
    <div className="grid gap-5">
      <div className="metric-grid grid-cols-2 lg:grid-cols-4">
        <CelulaMetrica rotulo="Meses com ATR" valor={fmtCount(ordenados.length)} legenda={`${fmtMoneyPorKgAtr(melhorAtr.precoKgAtr)} no melhor mês`} />
        <CelulaMetrica rotulo="Fazendas moídas" valor={fmtCount(grupos.length)} legenda={`${fmtToneladas(grupos.reduce((s, g) => s + g.toneladas, 0))}`} />
        <CelulaMetrica rotulo="Melhor mês" valor={maior.c.melhor?.rotulo ?? "—"} legenda={maior.c.melhor ? fmtMoney(maior.c.melhor.valor) : "—"} />
        <CelulaMetrica rotulo="Perda vs. melhor mês" valor={fmtMoney(perdaTotal)} legenda="somando todas as fazendas" />
      </div>

      <Moldura
        titulo="O que sua cana valeria em cada mês"
        descricao="Cada barra é a produção já colhida reavaliada pelo ATR daquele mês. A barra destacada é o mês em que a moagem realmente aconteceu."
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
              formatter={(v: unknown, nome: unknown, item: { payload?: { ehReal?: boolean } }) => [
                nome === "atr" ? fmtMoneyPorKgAtr(Number(v)) : fmtMoney(Number(v)),
                nome === "atr" ? "ATR do mês" : item?.payload?.ehReal ? "recebido (mês real)" : "hipótese do mês",
              ]}
              contentStyle={{ borderRadius: 10, border: "1px solid var(--line)", fontSize: 12 }}
            />
            <Bar dataKey="valor" name="Valor bruto" radius={[4, 4, 0, 0]} maxBarSize={64} isAnimationActive={false}>
              {serie.map((s) => (
                <Cell key={s.rotulo} fill={s.ehReal ? COR_REAL : "var(--line-strong)"} />
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
            <span className="size-3 rounded-sm" style={{ background: "var(--line-strong)" }} aria-hidden="true" /> Outro mês
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
                {ordenados.length > 0 && (
                  <>
                    {ordenados.map((m) => (
                      <th key={`${m.ano}-${m.mes}`} scope="col" className="text-right">
                        {`Se ${linhaMes(m).rotulo}`}
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
                  {ordenados.map((m) => {
                    const linha = c.linhas.find((l) => l.ano === m.ano && l.mes === m.mes);
                    if (!linha) return <td key={`${m.ano}-${m.mes}`} className="tnum text-right">—</td>;
                    return (
                      <td
                        key={`${m.ano}-${m.mes}`}
                        className={`tnum text-right ${linha.ehReal ? "font-semibold text-success-strong" : linha.diferenca < 0 ? "text-ink-3" : "text-ink-2"}`}
                      >
                        {c.semAtrNoMesReal ? "—" : fmtMoney(linha.valor)}
                        {linha.ehReal && <span className="block text-[0.6875rem] font-normal">recebido</span>}
                      </td>
                    );
                  })}
                  {ordenados.length > 0 && (
                    <td className="tnum text-right">{c.perdaVsMelhor > 0 ? fmtMoney(c.perdaVsMelhor) : "—"}</td>
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
   Aba 2 — Comparativo simulado / previsto
   ============================================================ */

function AbaPrevisto({ meses, colheitas, ultimoAtr }: { meses: MesAtr[]; colheitas: ColheitaComReceita[]; ultimoAtr: number | null }) {
  const grupos = useMemo(() => agruparPorMoinada(colheitas), [colheitas]);
  const alvo = useMemo(() => proximoMesAtr(meses), [meses]);
  const [texto, setTexto] = useState(() => (ultimoAtr ? String(ultimoAtr) : ""));
  const atrSimulado = parseDecimal(texto);
  const previsao = useMemo(
    () => simularProximoMes(grupos, meses, Number.isFinite(atrSimulado) ? atrSimulado : 0),
    [grupos, meses, atrSimulado],
  );

  if (alvo === null) {
    return <Vazio>Cadastre o ATR de pelo menos um mês para poder simular o seguinte.</Vazio>;
  }

  if (grupos.length === 0) {
    return <Vazio>Você ainda não tem colheitas reais registradas para comparar.</Vazio>;
  }

  const valido = Number.isFinite(atrSimulado) && atrSimulado > 0;
  const ordenados = mesesComAtr(meses);
  const ultimo = ordenados.length > 0 ? ordenados[ordenados.length - 1] : null;
  const ultimoRotulo = ultimo ? `${MESES[ultimo.mes - 1]}/${String(ultimo.ano).slice(2)}` : null;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Selo tipo="simulacao" />
        <p className="text-sm text-ink-2">
          Valor que <strong>você informa</strong>. Não é o ATR da usina — é a sua expectativa para{" "}
          {alvo.rotulo}.
        </p>
      </div>

      <Moldura
        titulo={`Simular o ATR de ${alvo.rotulo}`}
        descricao={
          ultimoRotulo
            ? `O último ATR anunciado pela usina foi o de ${ultimoRotulo}. Troque pelo valor que você espera para ${alvo.rotulo} e veja o efeito em cada fazenda.`
            : `Informe o valor que você espera para ${alvo.rotulo} e veja o efeito em cada fazenda.`
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo
            label={`ATR de ${alvo.rotulo} (R$/kg)`}
            htmlFor="atr-simulado"
            hint={
              ultimoAtr
                ? `Sugerido: último ATR real (${fmtMoneyPorKgAtr(ultimoAtr)}). Ex.: 1,2681`
                : "Ex.: 1,2681"
            }
          >
            <input
              id="atr-simulado"
              className="field-input tnum"
              inputMode="decimal"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="ex.: 1,2681"
            />
          </Campo>
          <div className="grid content-end gap-1">
            <p className="text-sm text-ink-2">
              Vale a comparação com o último ATR real
              {ultimoAtr ? <> de {fmtMoneyPorKgAtr(ultimoAtr)}</> : null}.
            </p>
          </div>
        </div>
      </Moldura>

      {valido ? (
        <>
          <div className="metric-grid grid-cols-2 lg:grid-cols-3">
            <CelulaMetrica rotulo="Mês simulado" valor={alvo.rotulo} legenda={`ATR de ${fmtMoneyPorKgAtr(atrSimulado)}`} />
            <CelulaMetrica
              rotulo="Impacto somando as fazendas"
              valor={comSinal(previsao.totalDiferenca)}
              legenda={previsao.totalDiferenca < 0 ? "perda estimada" : "ganho estimado"}
            />
            <CelulaMetrica
              rotulo="Fazendas afetadas"
              valor={fmtCount(previsao.linhas.length)}
              legenda={previsao.semBase > 0 ? `${previsao.semBase} sem base` : "todas com base"}
            />
          </div>

          <Moldura
            titulo="Quanto muda em cada fazenda"
            descricao="Pior efeito primeiro. Compara o valor bruto que a fazenda recebeu com o valor que receberia se o próximo mês fechar no ATR que você digitou."
          >
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Fazenda</th>
                    <th scope="col">Mês real</th>
                    <th scope="col" className="text-right">Toneladas</th>
                    <th scope="col" className="text-right">Recebido</th>
                    <th scope="col" className="text-right">Se {alvo.rotulo}</th>
                    <th scope="col" className="text-right">Diferença</th>
                  </tr>
                </thead>
                <tbody>
                  {previsao.linhas.map((l) => (
                    <tr key={l.grupo.id}>
                      <th scope="row" className="font-medium">{l.grupo.fazendaNome}</th>
                      <td className="text-ink-2">{l.mesReal}</td>
                      <td className="tnum text-right">{fmtToneladas(l.toneladas)}</td>
                      <td className="tnum text-right">{fmtMoney(l.receitaReal)}</td>
                      <td className="tnum text-right font-semibold">{fmtMoney(l.receitaPrevista)}</td>
                      <td className={`tnum text-right font-semibold ${l.perda ? "text-danger" : "text-success-strong"}`}>
                        {comSinal(l.diferenca)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Moldura>
        </>
      ) : (
        <Vazio>
          Digite um ATR maior que zero para ver o efeito nas suas fazendas.
        </Vazio>
      )}
    </div>
  );
}

/* ============================================================
   Tela
   ============================================================ */

export type PropsAtr = {
  meses: MesAtr[];
  colheitas: ColheitaComReceita[];
  ultimoAtr: number | null;
};

export default function SimuladorAtrComparacaoClient({ meses, colheitas, ultimoAtr }: PropsAtr) {
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
        titulo="Meses da safra — ATR anunciado pela usina"
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
          {
            id: "previsto",
            rotulo: "Previsto (simulação)",
            conteudo: <AbaPrevisto meses={meses} colheitas={colheitasFiltradas} ultimoAtr={ultimoAtr} />,
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
