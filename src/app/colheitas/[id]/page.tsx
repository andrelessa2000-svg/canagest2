import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";
import { prisma } from "@/lib/db";
import { userIdAtual } from "@/lib/auth";
import {
  fmtDate,
  fmtKgAtr,
  fmtMoney,
  fmtProd,
  fmtToneladas,
  fmtCount,
  TAREFAS_POR_HA,
} from "@/lib/format";
import { tipoLabel } from "@/lib/validators";
import {
  calcularColheita,
  MODELO_USINA_LABEL,
  type ItemDespesa,
  type ModeloUsina,
} from "@/lib/colheita";
import { areaColhidaHa } from "@/lib/rateio";
import { excluirColheitaRedirecionando } from "@/lib/actions";
import { CelulaMetrica } from "@/components/stat-cells";
import { ConfirmDelete } from "@/components/confirm-delete";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

function lerDividas(bruto: unknown): ItemDespesa[] {
  if (!Array.isArray(bruto)) return [];
  return bruto
    .filter((d): d is Record<string, unknown> => !!d && typeof d === "object")
    .map((d) => ({
      nome: String(d.nome ?? ""),
      valor: Number(d.valor ?? d.valorTotal) || 0,
    }));
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-sm text-ink-2">{rotulo}</dt>
      <dd className="tnum text-sm font-semibold text-ink">{valor}</dd>
    </div>
  );
}

function ListaItens({
  titulo,
  itens,
}: {
  titulo: string;
  itens: ItemDespesa[];
}) {
  if (itens.length === 0) return null;
  const total = itens.reduce((acc, i) => acc + i.valor, 0);
  return (
    <div className="ledger-panel p-5">
      <h2 className="font-display text-lg text-ink">{titulo}</h2>
      <dl className="mt-2 divide-y divide-line">
        {itens.map((i, idx) => (
          <Linha key={idx} rotulo={i.nome} valor={fmtMoney(i.valor)} />
        ))}
        <Linha rotulo="Total" valor={fmtMoney(total)} />
      </dl>
    </div>
  );
}

export default async function ColheitaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const c = await prisma.colheita.findUnique({
    where: { id, userId: await userIdAtual() },
    include: {
      fazenda: {
        select: {
          id: true,
          nome: true,
          talhoes: { select: { id: true, fazendaId: true, areaHa: true } },
        },
      },
      usina: { select: { nome: true, modelo: true } },
      custo: true,
    },
  });

  if (!c) notFound();

  const areaFazenda = c.fazenda.talhoes.reduce((a, t) => a + t.areaHa, 0);
  const areaColhidaHaColheita = areaColhidaHa(c, c.fazendaId, c.fazenda.talhoes);
  const tarefasColhidas = areaColhidaHaColheita * TAREFAS_POR_HA;
  const custo = c.custo;

  const dividas = lerDividas(custo?.dividas);
  const r = calcularColheita({
    modelo: c.usina.modelo,
    tipo: c.tipo,
    toneladas: c.toneladas,
    precoCana: c.precoCana,
    agio: c.agio,
    atrPorTonelada: c.atrPorTonelada,
    precoKgAtr: c.precoKgAtr,
    ctc: custo?.ctc,
    arrendar: custo?.arrendar ?? false,
    tonsPorTarefa: custo?.tonsPorTarefa,
    tarefasArrendadas: custo?.tarefasArrendadas,
    dividas,
  });

  const ehCoruripe = c.usina.modelo === "coruripe";
  const modeloLabel = MODELO_USINA_LABEL[c.usina.modelo as ModeloUsina];

  const talhoesColhidosInfo =
    (c.talhoesColhidos as { id: string; areaHa: number }[] | null) ?? [];
  const talhoesTodos = await prisma.talhao.findMany({
    where: { userId: await userIdAtual() },
    select: { id: true, nome: true, areaHa: true },
  });
  const sel = talhoesTodos
    .map((t) => {
      const info = talhoesColhidosInfo.find((x) => x.id === t.id);
      return info ? { ...t, areaColhida: info.areaHa } : null;
    })
    .filter((t): t is NonNullable<typeof t> => t !== null);
  const areaSel = sel.reduce((a, t) => a + t.areaColhida, 0);
  const rateio = sel.map((t) => {
    const prop = areaSel > 0 ? t.areaColhida / areaSel : 0;
    return {
      nome: t.nome,
      toneladas: c.toneladas * prop,
      tHa: t.areaColhida > 0 ? (c.toneladas * prop) / t.areaColhida : 0,
      receita: r.receita * prop,
    };
  });

  return (
    <>
      <Link
        href="/colheitas"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-3 hover:text-ink"
      >
        <ChevronLeft className="size-4" /> Colheitas
      </Link>

      <PageHeader
        rotulo={`colheita · ${c.usina.nome}`}
        titulo={fmtDate(c.data)}
        descricao={`${c.fazenda.nome} · ${tipoLabel(c.tipo)}${c.safra ? ` · Safra ${c.safra}` : ""}${c.projecao ? " · Projeção" : ""}`}
        acao={
          <>
            <Link
              href={`/colheitas/${c.id}/editar`}
              className="inline-flex size-9 items-center justify-center rounded-lg border border-line text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
              aria-label="Editar colheita"
            >
              <Pencil className="size-4" />
            </Link>
            <ConfirmDelete
              action={excluirColheitaRedirecionando.bind(null, c.id)}
              titulo="Excluir colheita?"
              mensagem={`O registro de ${fmtToneladas(c.toneladas)} de ${fmtDate(c.data)} será apagado.`}
              verbo="Excluir"
            />
          </>
        }
      />

      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[10px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        <CelulaMetrica rotulo="Toneladas" valor={fmtToneladas(c.toneladas)} />
        {ehCoruripe ? (
          <CelulaMetrica rotulo="ATR total" valor={fmtKgAtr(r.atrTotal)} />
        ) : (
          <CelulaMetrica
            rotulo="Produtividade"
            valor={fmtProd(areaFazenda > 0 ? c.toneladas / areaFazenda : 0)}
          />
        )}
        <CelulaMetrica rotulo="Receita" valor={fmtMoney(r.receita)} />
        <CelulaMetrica rotulo="Lucro bruto" valor={fmtMoney(r.lucro)} destaque />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <section className="ledger-panel p-5">
          <h2 className="font-display text-lg text-ink">Identificação</h2>
          <dl className="mt-2 divide-y divide-line">
            <Linha rotulo="Fazenda" valor={c.fazenda.nome} />
            <Linha rotulo="Usina" valor={`${c.usina.nome} (${modeloLabel})`} />
            <Linha rotulo="Data" valor={fmtDate(c.data)} />
            <Linha rotulo="Tipo de corte" valor={tipoLabel(c.tipo)} />
          </dl>
        </section>

        <section className="ledger-panel p-5">
          <h2 className="font-display text-lg text-ink">Produção e remuneração</h2>
          <dl className="mt-2 divide-y divide-line">
            <Linha rotulo="Toneladas colhidas" valor={fmtToneladas(c.toneladas)} />
            <Linha
              rotulo="Área colhida"
              valor={`${fmtCount(tarefasColhidas)} tarefas`}
            />
            {ehCoruripe ? (
              <>
                <Linha
                  rotulo="ATR por tonelada"
                  valor={`${(c.atrPorTonelada ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 })} kg ATR/t`}
                />
                <Linha rotulo="Preço do kg de ATR" valor={fmtMoney(c.precoKgAtr ?? 0)} />
                <Linha rotulo="ATR total" valor={fmtKgAtr(r.atrTotal)} />
              </>
            ) : (
              <>
                <Linha rotulo="Preço da cana (R$/t)" valor={fmtMoney(c.precoCana ?? 0)} />
                <Linha rotulo="Ágio (R$/t)" valor={fmtMoney(c.agio ?? 0)} />
              </>
            )}
            <Linha rotulo="CTC" valor={fmtMoney(r.ctc)} />
          </dl>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {custo?.arrendar && (
          <section className="ledger-panel p-5">
            <h2 className="font-display text-lg text-ink">Arrendamento</h2>
            <dl className="mt-2 divide-y divide-line">
              <Linha rotulo="Toneladas por tarefa" valor={fmtCount(custo?.tonsPorTarefa ?? 0)} />
              <Linha rotulo="Tarefas arrendadas" valor={fmtCount(custo?.tarefasArrendadas ?? 0)} />
              <Linha rotulo="Valor do arrendamento" valor={fmtMoney(r.arrendamento)} />
            </dl>
          </section>
        )}
        <ListaItens titulo="Dívidas com usina ou terceiros" itens={dividas} />
      </div>

      {rateio.length > 0 && (
        <section className="ledger-panel mt-4 p-5">
          <h2 className="font-display text-lg text-ink">Talhões colhidos (rateio por área)</h2>
          <div className="overflow-x-auto rounded-[10px] border border-line bg-surface">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-3">
                  <th className="px-3 py-2 font-semibold">Talhão</th>
                  <th className="px-3 py-2 text-right font-semibold">Toneladas</th>
                  <th className="px-3 py-2 text-right font-semibold">t/ha</th>
                  <th className="px-3 py-2 text-right font-semibold">Receita</th>
                </tr>
              </thead>
              <tbody>
                {rateio.map((r) => (
                  <tr key={r.nome} className="border-b border-line">
                    <td className="px-3 py-2 font-medium text-ink">{r.nome}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink">{r.toneladas.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink">{r.tHa.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink">{fmtMoney(r.receita)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-ink-3">
            Media por talhão — a usina reporta o total da fazenda; se reparte proporcional à área.
          </p>
        </section>
      )}

      <section className="ledger-panel mt-4 p-5">
        <h2 className="font-display text-lg text-ink">Resultado</h2>
        <dl className="mt-2 divide-y divide-line">
          <Linha rotulo="Receita" valor={fmtMoney(r.receita)} />
          <Linha rotulo="CTC" valor={fmtMoney(r.ctc)} />
          {r.arrendamento > 0 && (
            <Linha rotulo="Arrendamento" valor={fmtMoney(r.arrendamento)} />
          )}
          {r.dividas > 0 && (
            <Linha
              rotulo="Dívidas com usina ou terceiros"
              valor={fmtMoney(r.dividas)}
            />
          )}
          <Linha rotulo="Total de despesas" valor={fmtMoney(r.totalDespesas)} />
          <Linha rotulo="Lucro bruto" valor={fmtMoney(r.lucro)} />
        </dl>
        <div className="mt-3 grid grid-cols-1 gap-px overflow-hidden rounded-[10px] border border-line bg-line sm:grid-cols-3">
          <CelulaMetrica rotulo="Receita/t" valor={fmtMoney(r.receitaPorTonelada)} />
          <CelulaMetrica rotulo="Custo/t" valor={fmtMoney(r.custoPorTonelada)} />
          <CelulaMetrica rotulo="Lucro/t" valor={fmtMoney(r.lucroPorTonelada)} destaque />
        </div>
        {c.observacao && (
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink-2">
            {c.observacao}
          </p>
        )}
      </section>
    </>
  );
}