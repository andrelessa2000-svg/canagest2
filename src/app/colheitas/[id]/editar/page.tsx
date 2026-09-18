import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { atualizarColheita } from "@/lib/actions";
import { toDateInputValue, fmtDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { ColheitaForm } from "@/components/colheita-form";

export const dynamic = "force-dynamic";

function numero(v: number | null | undefined): string {
  if (v === null || v === undefined) return "";
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 10 });
}

export default async function EditarColheitaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [colheita, talhoes, usinas] = await Promise.all([
    prisma.colheita.findUnique({ where: { id } }),
    prisma.talhao.findMany({
      select: {
        id: true,
        nome: true,
        areaHa: true,
        fazendaId: true,
        fazenda: { select: { nome: true } },
      },
      orderBy: [{ fazenda: { nome: "asc" } }, { nome: "asc" }],
    }),
    prisma.usina.findMany({
      select: { id: true, nome: true, modelo: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  if (!colheita) notFound();

  return (
    <>
      <Link
        href={`/colheitas/${id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-3 hover:text-ink"
      >
        <ChevronLeft className="size-4" /> {fmtDate(colheita.data)}
      </Link>
      <PageHeader
        rotulo="colheita · edição"
        titulo="Editar colheita"
        descricao="Atualize a produção, a remuneração e as despesas. O resultado é recalculado."
      />
      <div className="mx-auto max-w-3xl">
        <ColheitaForm
          acao={atualizarColheita.bind(null, id)}
          talhoes={talhoes.map((t) => ({
            id: t.id,
            nome: t.nome,
            areaHa: t.areaHa,
            fazendaId: t.fazendaId,
            fazendaNome: t.fazenda.nome,
          }))}
          usinas={usinas}
          modo="editar"
          cancelarHref={`/colheitas/${id}`}
          inicial={{
            talhaoId: colheita.talhaoId,
            usinaId: colheita.usinaId,
            data: toDateInputValue(colheita.data),
            tipo: colheita.tipo,
            toneladas: numero(colheita.toneladas),
            valorTonelada: numero(colheita.valorTonelada),
            complemento: numero(colheita.complemento),
            complementoTipo: colheita.complementoTipo ?? "total",
            atrPorTonelada: numero(colheita.atrPorTonelada),
            precoKgAtr: numero(colheita.precoKgAtr),
            outrosAdicionais: numero(colheita.outrosAdicionais),
            despCorte: numero(colheita.despCorte),
            despTransporte: numero(colheita.despTransporte),
            despOutrasColheita: numero(colheita.despOutrasColheita),
            despPlantioUsina: numero(colheita.despPlantioUsina),
            despArrendamento: numero(colheita.despArrendamento),
            despAdubacao: numero(colheita.despAdubacao),
            despHerbicida: numero(colheita.despHerbicida),
            despOutras: numero(colheita.despOutras),
            observacao: colheita.observacao ?? "",
          }}
        />
      </div>
    </>
  );
}
