import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { criarPlantio } from "@/lib/actions";
import { PageHeader } from "@/components/page-header";
import { PlantioForm } from "@/components/plantio-form";

export const dynamic = "force-dynamic";

export default async function NovoPlantioPage() {
  const [fazendas, talhoes, safrasRaw, plantiosMedia] = await Promise.all([
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
    prisma.plantio.findMany({
      where: { areaHa: { gt: 0 }, valor: { gt: 0 } },
      select: { valor: true, areaHa: true },
    }),
  ]);

  const safras = safrasRaw.map((s) => s.safra).filter((s) => typeof s === "string");

  const areaTotalPlantios = plantiosMedia.reduce((a, p) => a + (p.areaHa ?? 0), 0);
  const valorTotalPlantios = plantiosMedia.reduce((a, p) => a + p.valor, 0);
  const mediaPorHa = areaTotalPlantios > 0 ? valorTotalPlantios / areaTotalPlantios : null;

  return (
    <>
      <Link
        href="/plantio"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-3 hover:text-ink"
      >
        <ChevronLeft className="size-4" /> Plantio
      </Link>
      <PageHeader
        rotulo="cultivos"
        titulo="Novo plantio"
        descricao="Registre o custo de plantio ou reforma."
      />
      <div className="mx-auto max-w-2xl rounded-[10px] border border-line bg-surface p-5 sm:p-8">
        <PlantioForm
          acao={criarPlantio}
          fazendas={fazendas.map((f) => ({
            id: f.id,
            nome: f.nome,
            areaHa: f.talhoes.reduce((a, t) => a + t.areaHa, 0),
          }))}
          talhoes={talhoes}
          safras={safras}
          mediaPorHa={mediaPorHa}
        />
      </div>
    </>
  );
}