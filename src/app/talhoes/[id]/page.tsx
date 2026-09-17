import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import {
  fmtArea,
  fmtCount,
  fmtDate,
  fmtProd,
  fmtTons,
} from "@/lib/format";
import { tipoLabel } from "@/lib/validators";
import { excluirTalhao } from "@/lib/actions";
import { PageHeader } from "@/components/page-header";
import { ConfirmDelete } from "@/components/confirm-delete";
import { CelulaMetrica, GradeMetricas } from "@/components/stat-cells";

export const dynamic = "force-dynamic";

export default async function TalhaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const talhao = await prisma.talhao.findUnique({
    where: { id },
    include: {
      fazenda: { select: { id: true, nome: true } },
      colheitas: { orderBy: { data: "desc" } },
    },
  });

  if (!talhao) notFound();

  const colhido = talhao.colheitas.reduce((n, c) => n + c.toneladas, 0);
  const prodMedia = colhido / talhao.areaHa;
  const ultimaSoca = talhao.colheitas.find((c) => c.tipo !== "planta");

  return (
    <>
      <Link
        href={`/fazendas/${talhao.fazendaId}`}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-3 hover:text-ink"
      >
        <ChevronLeft className="size-4" /> {talhao.fazenda.nome}
      </Link>

      <PageHeader
        rotulo="talhão · cadastro"
        titulo={talhao.nome}
        descricao={`${
          talhao.variedade || "Variedade não informada"
        }${talhao.dataPlantio ? ` · plantado em ${fmtDate(talhao.dataPlantio)}` : ""}`}
        acao={
          <>
            <Link
              href={`/talhoes/${talhao.id}/editar`}
              className="inline-flex size-9 items-center justify-center rounded-lg border border-line text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
              aria-label="Editar talhão"
            >
              <Pencil className="size-4" />
            </Link>
            <ConfirmDelete
              action={excluirTalhao.bind(null, talhao.id)}
              titulo="Excluir talhão?"
              mensagem={` " ${talhao.nome} " e todas as suas colheitas serão apagados. Essa ação não pode ser desfeita.`}
              verbo="Excluir"
            />
            <Link href={`/colheitas/nova?talhao=${talhao.id}`} className="btn btn-primary">
              <Plus className="size-4" /> Nova colheita
            </Link>
          </>
        }
      />

      <GradeMetricas>
        <CelulaMetrica
          rotulo="Área"
          valor={fmtArea(talhao.areaHa)}
          legenda="do talhão"
        />
        <CelulaMetrica
          rotulo="Colheitas"
          valor={fmtCount(talhao.colheitas.length)}
          legenda="registros"
        />
        <CelulaMetrica
          rotulo="Colhido total"
          valor={fmtTons(colhido)}
          legenda={
            ultimaSoca
              ? `última: ${tipoLabel(ultimaSoca.tipo).toLowerCase()}`
              : "acumulado"
          }
        />
        <CelulaMetrica
          rotulo="Produtividade"
          valor={fmtProd(prodMedia)}
          legenda="média colhida"
        />
      </GradeMetricas>

      <section className="mt-10 grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-ink">Histórico de colheitas</h2>
        </div>

        {talhao.colheitas.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line-strong bg-surface/60 px-4 py-6 text-sm text-ink-2">
            Nenhuma colheita registrada para este talhão.{" "}
            <Link
              href={`/colheitas/nova?talhao=${talhao.id}`}
              className="font-semibold text-accent underline underline-offset-2"
            >
              Registrar a primeira
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-[10px] border border-line bg-surface px-3">
            {talhao.colheitas.map((c) => {
              const prod = c.toneladas / talhao.areaHa;
              return (
                <li
                  key={c.id}
                  className="-mx-2 flex items-center justify-between gap-3 px-2 py-3"
                >
                  <span className="grid gap-0.5">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                      {fmtDate(c.data)}
                      <span className="rounded-md bg-surface-muted px-1.5 py-0.5 text-xs font-semibold text-ink-2">
                        {tipoLabel(c.tipo)}
                      </span>
                    </span>
                    {c.observacao && (
                      <span className="text-xs text-ink-3">{c.observacao}</span>
                    )}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="hidden text-xs text-ink-3 sm:block">
                      {fmtProd(prod)}
                    </span>
                    <span className="tnum text-sm font-semibold text-ink">
                      {fmtTons(c.toneladas)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}