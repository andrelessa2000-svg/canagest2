import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { atualizarColheita } from "@/lib/actions";
import { toDateInputValue, fmtDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { ColheitaForm } from "@/components/colheita-form";
import { userIdAtual } from "@/lib/auth";
import { safrasDoUsuario } from "@/lib/safras-usuario";
import { type Despesa } from "@/components/editor-despesas";

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

  const [colheita, fazendasRaw, usinas, talhoes, safras] = await Promise.all([
    prisma.colheita.findUnique({
      where: { id, userId: await userIdAtual() },
      include: { custo: true },
    }),
    prisma.fazenda.findMany({
      where: { userId: await userIdAtual() },
      select: { id: true, nome: true, talhoes: { select: { areaHa: true } } },
      orderBy: { nome: "asc" },
    }),
    prisma.usina.findMany({
      where: { userId: await userIdAtual() },
      select: { id: true, nome: true, modelo: true },
      orderBy: { nome: "asc" },
    }),
    prisma.talhao.findMany({
      where: { userId: await userIdAtual() },
      select: { id: true, nome: true, fazendaId: true, areaHa: true },
      orderBy: { nome: "asc" },
    }),
    safrasDoUsuario(),
  ]);

  if (!colheita) notFound();

  const custo = colheita.custo;
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
          safras={safras}
          modo="editar"
          cancelarHref={`/colheitas/${id}`}
          inicial={{
            fazendaId: colheita.fazendaId,
            usinaId: colheita.usinaId,
            data: toDateInputValue(colheita.data),
            tipo: colheita.tipo,
            safra: colheita.safra ?? "",
            projecao: colheita.projecao,
            toneladas: numero(colheita.toneladas),
            precoCana: numero(colheita.precoCana),
            agio: numero(colheita.agio),
            atrPorTonelada: numero(colheita.atrPorTonelada),
            precoKgAtr: numero(colheita.precoKgAtr),
            ctc: numero(custo?.ctc),
            areaColhida: numero(colheita.areaColhida),
            escopo: colheita.escopo ?? "fazenda",
            talhaoId: colheita.talhaoId,
            talhoesIds: colheita.talhoesIds,
            alocacoes: colheita.alocacoes,
            arrendar: custo?.arrendar ?? false,
            tonsPorTarefa: numero(custo?.tonsPorTarefa),
            tarefasArrendadas: numero(custo?.tarefasArrendadas),
            dividas: (custo?.dividas as unknown as Despesa[]) ?? [],
            observacao: colheita.observacao ?? "",
          }}
        />
      </div>
    </>
  );
}