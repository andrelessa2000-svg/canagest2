import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";
import { prisma } from "@/lib/db";
import {
  fmtDate,
  fmtKgAtr,
  fmtMoney,
  fmtProd,
  fmtToneladas,
  fmtCount,
} from "@/lib/format";
import { tipoLabel } from "@/lib/validators";
import {
  calcularColheita,
  sacosAduboTarefa,
  MODELO_USINA_LABEL,
  type ItemDespesa,
  type ModeloUsina,
} from "@/lib/colheita";
import { excluirColheitaRedirecionando } from "@/lib/actions";
import { CelulaMetrica } from "@/components/stat-cells";
import { ConfirmDelete } from "@/components/confirm-delete";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

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
    where: { id },
    include: {
      fazenda: {
        select: {
          id: true,
          nome: true,
          talhoes: { select: { areaHa: true } },
        },
      },
      usina: { select: { nome: true, modelo: true } },
    },
  });

  if (!c) notFound();

  const areaFazenda = c.fazenda.talhoes.reduce((a, t) => a + t.areaHa, 0);

  const herbicidas = (c.herbicidas ?? []) as ItemDespesa[];
  const insumos = (c.insumos ?? []) as ItemDespesa[];
  const despesasUsina = (c.despesasUsina ?? []) as ItemDespesa[];
  const r = calcularColheita({
    modelo: c.usina.modelo,
    tipo: c.tipo,
    toneladas: c.toneladas,
    precoCana: c.precoCana,
    agio: c.agio,
    atrPorTonelada: c.atrPorTonelada,
    precoKgAtr: c.precoKgAtr,
    ctc: c.ctc,
    areaColhida: c.areaColhida,
    arrendar: c.arrendar,
    tonsPorTarefa: c.tonsPorTarefa,
    tarefasArrendadas: c.tarefasArrendadas,
    adubo: c.adubo,
    precoTonAdubo: c.precoTonAdubo,
    tarefasAdubo: c.tarefasAdubo ?? undefined,
    herbicidas,
    insumos,
    despesasUsina,
  });

  const ehCoruripe = c.usina.modelo === "coruripe";
  const modeloLabel = MODELO_USINA_LABEL[c.usina.modelo as ModeloUsina];

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
        descricao={`${c.fazenda.nome} · ${tipoLabel(c.tipo)}`}
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
              valor={`${fmtCount(c.areaColhida ?? 0)} tarefas`}
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
        {c.arrendar && (
          <section className="ledger-panel p-5">
            <h2 className="font-display text-lg text-ink">Arrendamento</h2>
            <dl className="mt-2 divide-y divide-line">
              <Linha rotulo="Toneladas por tarefa" valor={fmtCount(c.tonsPorTarefa ?? 0)} />
              <Linha rotulo="Tarefas arrendadas" valor={fmtCount(c.tarefasArrendadas ?? 0)} />
              <Linha rotulo="Valor do arrendamento" valor={fmtMoney(r.arrendamento)} />
            </dl>
          </section>
        )}
        {c.adubo && (
          <section className="ledger-panel p-5">
            <h2 className="font-display text-lg text-ink">Adubo</h2>
            <dl className="mt-2 divide-y divide-line">
              <Linha
                rotulo="Sacos por tarefa"
                valor={`${sacosAduboTarefa(c.tipo)} sacos de 50 kg`}
              />
              <Linha rotulo="Área" valor={`${fmtCount(c.tarefasAdubo ?? 0)} tarefas`} />
              <Linha rotulo="Preço da tonelada" valor={fmtMoney(c.precoTonAdubo ?? 0)} />
              <Linha rotulo="Valor do adubo" valor={fmtMoney(r.adubo)} />
            </dl>
          </section>
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ListaItens titulo="Herbicida (calda)" itens={herbicidas} />
        <ListaItens titulo="Outros insumos" itens={insumos} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ListaItens titulo="Despesas com a usina" itens={despesasUsina} />
        <div />
      </div>

      <section className="ledger-panel mt-4 p-5">
        <h2 className="font-display text-lg text-ink">Resultado</h2>
        <dl className="mt-2 divide-y divide-line">
          <Linha rotulo="Receita" valor={fmtMoney(r.receita)} />
          <Linha rotulo="CTC" valor={fmtMoney(r.ctc)} />
          {r.arrendamento > 0 && (
            <Linha rotulo="Arrendamento" valor={fmtMoney(r.arrendamento)} />
          )}
          {r.adubo > 0 && <Linha rotulo="Adubo" valor={fmtMoney(r.adubo)} />}
          {r.herbicida > 0 && <Linha rotulo="Herbicida" valor={fmtMoney(r.herbicida)} />}
          {r.insumos > 0 && (
            <Linha rotulo="Outros insumos" valor={fmtMoney(r.insumos)} />
          )}
          {r.despesasUsina > 0 && (
            <Linha rotulo="Despesas com a usina" valor={fmtMoney(r.despesasUsina)} />
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