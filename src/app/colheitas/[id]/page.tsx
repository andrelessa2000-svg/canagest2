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
} from "@/lib/format";
import { tipoLabel } from "@/lib/validators";
import {
  calcularColheita,
  COMPLEMENTO_TIPO_LABEL,
  DESPESAS,
  type ComplementoTipo,
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

export default async function ColheitaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const c = await prisma.colheita.findUnique({
    where: { id },
    include: {
      talhao: {
        select: {
          id: true,
          nome: true,
          areaHa: true,
          fazenda: { select: { id: true, nome: true } },
        },
      },
      usina: { select: { nome: true, modelo: true } },
    },
  });

  if (!c) notFound();

  const r = calcularColheita({
    modelo: c.usina.modelo,
    toneladas: c.toneladas,
    valorTonelada: c.valorTonelada,
    complemento: c.complemento,
    complementoTipo: c.complementoTipo,
    atrPorTonelada: c.atrPorTonelada,
    precoKgAtr: c.precoKgAtr,
    outrosAdicionais: c.outrosAdicionais,
    despCorte: c.despCorte,
    despTransporte: c.despTransporte,
    despOutrasColheita: c.despOutrasColheita,
    despPlantioUsina: c.despPlantioUsina,
    despArrendamento: c.despArrendamento,
    despAdubacao: c.despAdubacao,
    despHerbicida: c.despHerbicida,
    despOutras: c.despOutras,
  });

  const ehCoruripe = c.usina.modelo === "coruripe";
  const modeloLabel = (c.usina.modelo as ModeloUsina) === "coruripe" ? "Coruripe" : "Pindorama";

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
        descricao={`${c.talhao.fazenda.nome} · Talhão ${c.talhao.nome} · ${tipoLabel(c.tipo)}`}
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
            valor={fmtProd(c.toneladas / c.talhao.areaHa)}
          />
        )}
        <CelulaMetrica rotulo="Receita bruta" valor={fmtMoney(r.valorBruto)} />
        <CelulaMetrica rotulo="Lucro líquido" valor={fmtMoney(r.lucro)} destaque />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <section className="ledger-panel p-5">
          <h2 className="font-display text-lg text-ink">Identificação</h2>
          <dl className="mt-2 divide-y divide-line">
            <Linha rotulo="Fazenda" valor={c.talhao.fazenda.nome} />
            <Linha rotulo="Talhão" valor={c.talhao.nome} />
            <Linha rotulo="Usina" valor={`${c.usina.nome} (${modeloLabel})`} />
            <Linha rotulo="Data" valor={fmtDate(c.data)} />
            <Linha rotulo="Tipo de corte" valor={tipoLabel(c.tipo)} />
          </dl>
        </section>

        <section className="ledger-panel p-5">
          <h2 className="font-display text-lg text-ink">Produção</h2>
          <dl className="mt-2 divide-y divide-line">
            <Linha rotulo="Toneladas colhidas" valor={fmtToneladas(c.toneladas)} />
            {ehCoruripe && (
              <>
                <Linha
                  rotulo="ATR por tonelada"
                  valor={`${(c.atrPorTonelada ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 })} kg ATR/t`}
                />
                <Linha rotulo="ATR total" valor={fmtKgAtr(r.atrTotal)} />
              </>
            )}
            <Linha
              rotulo="Área do talhão"
              valor={`${c.talhao.areaHa.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ha`}
            />
            <Linha
              rotulo="Produtividade"
              valor={fmtProd(c.toneladas / c.talhao.areaHa)}
            />
          </dl>
        </section>

        <section className="ledger-panel p-5">
          <h2 className="font-display text-lg text-ink">Remuneração</h2>
          <dl className="mt-2 divide-y divide-line">
            {ehCoruripe ? (
              <>
                {c.precoKgAtr !== null && (
                  <Linha
                    rotulo="Preço do kg de ATR"
                    valor={fmtMoney(c.precoKgAtr)}
                  />
                )}
                <Linha
                  rotulo="Valor base"
                  valor={fmtMoney(r.valorBase)}
                />
                <Linha rotulo="Complemento/ágio" valor={fmtMoney(r.valorComplemento)} />
                <Linha rotulo="Outros adicionais" valor={fmtMoney(r.valorOutrosAdicionais)} />
              </>
            ) : (
              <>
                <Linha
                  rotulo="Valor da tonelada"
                  valor={fmtMoney(c.valorTonelada ?? 0)}
                />
                <Linha
                  rotulo={`Complemento/ágio (${
                    COMPLEMENTO_TIPO_LABEL[
                      (c.complementoTipo as ComplementoTipo) ?? "total"
                    ]
                  })`}
                  valor={fmtMoney(r.valorComplemento)}
                />
              </>
            )}
            <Linha rotulo="Receita bruta" valor={fmtMoney(r.valorBruto)} />
          </dl>
        </section>

        <section className="ledger-panel p-5">
          <h2 className="font-display text-lg text-ink">Despesas</h2>
          <dl className="mt-2 divide-y divide-line">
            {DESPESAS.map((d) => {
              const valor = c[d.campo];
              return (
                <div
                  key={d.campo}
                  className="flex items-baseline justify-between gap-4 py-2"
                >
                  <dt className={`text-sm ${valor > 0 ? "text-ink-2" : "text-ink-3"}`}>
                    {d.rotulo}
                  </dt>
                  <dd
                    className={`tnum text-sm font-semibold ${
                      valor > 0 ? "text-ink" : "text-ink-3"
                    }`}
                  >
                    {fmtMoney(valor)}
                  </dd>
                </div>
              );
            })}
            <Linha rotulo="Total de despesas" valor={fmtMoney(r.totalDespesas)} />
          </dl>
        </section>
      </div>

      <section className="ledger-panel mt-4 p-5">
        <h2 className="font-display text-lg text-ink">Resultado</h2>
        <div className="mt-3 grid grid-cols-1 gap-px overflow-hidden rounded-[10px] border border-line bg-line sm:grid-cols-3">
          <CelulaMetrica rotulo="Receita/t" valor={fmtMoney(r.receitaPorTonelada)} />
          <CelulaMetrica rotulo="Custo/t" valor={fmtMoney(r.custoPorTonelada)} />
          <CelulaMetrica
            rotulo="Lucro/t"
            valor={fmtMoney(r.lucroPorTonelada)}
            destaque
          />
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
