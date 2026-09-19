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

  const [colheita, fazendasRaw, usinas, talhoes] = await Promise.all([
    prisma.colheita.findUnique({ where: { id } }),
    prisma.fazenda.findMany({
      select: { id: true, nome: true, talhoes: { select: { areaHa: true } } },
      orderBy: { nome: "asc" },
    }),
    prisma.usina.findMany({
      select: { id: true, nome: true, modelo: true },
      orderBy: { nome: "asc" },
    }),
    prisma.talhao.findMany({
      select: { id: true, nome: true, areaHa: true, fazendaId: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  if (!colheita) notFound();

  const fazendas = fazendasRaw.map((f) => ({
    id: f.id,
    nome: f.nome,
    areaHa: f.talhoes.reduce((a, t) => a + t.areaHa, 0),
  }));

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
          fazendas={fazendas}
          usinas={usinas}
          talhoes={talhoes}
          modo="editar"
          cancelarHref={`/colheitas/${id}`}
          inicial={{
            fazendaId: colheita.fazendaId,
            talhaoId: colheita.talhaoId ?? "",
            usinaId: colheita.usinaId,
            data: toDateInputValue(colheita.data),
            tipo: colheita.tipo,
            toneladas: numero(colheita.toneladas),
            precoCana: numero(colheita.precoCana),
            agio: numero(colheita.agio),
            atrPorTonelada: numero(colheita.atrPorTonelada),
            precoKgAtr: numero(colheita.precoKgAtr),
            ctc: numero(colheita.ctc),
            areaColhida: numero(colheita.areaColhida),
            arrendar: colheita.arrendar,
            tonsPorTarefa: numero(colheita.tonsPorTarefa),
            tarefasArrendadas: numero(colheita.tarefasArrendadas),
            adubo: colheita.adubo,
            precoTonAdubo: numero(colheita.precoTonAdubo),
            tarefasAdubo: numero(colheita.tarefasAdubo),
            observacao: colheita.observacao ?? "",
            herbicidas: (
              (colheita.herbicidas as unknown as { nome?: string; valor?: number }[]) ??
              []
            ).map((i) => ({
              nome: i.nome ?? "",
              valor: i.valor === undefined ? "" : numero(i.valor),
            })),
            insumos: (
              (colheita.insumos as unknown as { nome?: string; valor?: number }[]) ??
              []
            ).map((i) => ({
              nome: i.nome ?? "",
              valor: i.valor === undefined ? "" : numero(i.valor),
            })),
            despesasUsina: (
              (colheita.despesasUsina as unknown as { nome?: string; valor?: number }[]) ??
              []
            ).map((i) => ({
              nome: i.nome ?? "",
              valor: i.valor === undefined ? "" : numero(i.valor),
            })),
          }}
        />
      </div>
    </>
  );
}