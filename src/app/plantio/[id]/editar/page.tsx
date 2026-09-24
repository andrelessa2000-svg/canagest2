import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { atualizarPlantio } from "@/lib/actions";
import { toDateInputValue } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { PlantioForm } from "@/components/plantio-form";

export const dynamic = "force-dynamic";

function numero(v: number | null | undefined): string {
  if (v === null || v === undefined) return "";
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 10 });
}

export default async function EditarPlantioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [plantio, fazendas, talhoes, safrasRaw] = await Promise.all([
    prisma.plantio.findUnique({ where: { id } }),
    prisma.fazenda.findMany({
      select: { id: true, nome: true, talhoes: { select: { areaHa: true } } },
      orderBy: { nome: "asc" },
    }),
    prisma.talhao.findMany({
      select: { id: true, nome: true, fazendaId: true },
      orderBy: { nome: "asc" },
    }),
    prisma.colheita.findMany({
      where: { safra: { not: null } },
      select: { safra: true },
      distinct: ["safra"],
      orderBy: { safra: "asc" },
    }),
  ]);

  if (!plantio) notFound();

  const safras = safrasRaw.map((s) => s.safra).filter((s) => typeof s === "string");

  return (
    <>
      <Link
        href="/plantio"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-3 hover:text-ink"
      >
        <ChevronLeft className="size-4" /> Plantio
      </Link>
      <PageHeader rotulo="cultivos" titulo="Editar plantio" />
      <div className="mx-auto max-w-2xl rounded-[10px] border border-line bg-surface p-5 sm:p-8">
        <PlantioForm
          acao={atualizarPlantio.bind(null, id)}
          fazendas={fazendas.map((f) => ({
            id: f.id,
            nome: f.nome,
            areaHa: f.talhoes.reduce((a, t) => a + t.areaHa, 0),
          }))}
          talhoes={talhoes}
          safras={safras}
          inicial={{
            fazendaId: plantio.fazendaId,
            talhaoId: plantio.talhaoId ?? "",
            safra: plantio.safra ?? "",
            tipo: plantio.tipo,
            data: toDateInputValue(plantio.data),
            valor: numero(plantio.valor),
            projecao: plantio.projecao,
            areaHa: numero(plantio.areaHa),
            observacao: plantio.observacao ?? "",
          }}
        />
      </div>
    </>
  );
}