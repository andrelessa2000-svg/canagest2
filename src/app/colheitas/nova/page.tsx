import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { criarColheita } from "@/lib/actions";
import { PageHeader } from "@/components/page-header";
import { ColheitaForm } from "@/components/colheita-form";

export const dynamic = "force-dynamic";

export default async function NovaColheitaPage({
  searchParams,
}: {
  searchParams: Promise<{ talhao?: string }>;
}) {
  const [{ talhao }, talhoes] = await Promise.all([
    searchParams,
    prisma.talhao.findMany({
      select: {
        id: true,
        nome: true,
        areaHa: true,
        fazenda: { select: { nome: true } },
      },
      orderBy: [{ fazenda: { nome: "asc" } }, { nome: "asc" }],
    }),
  ]);

  const talhaoPreselecionado = talhoes.some((t) => t.id === talhao)
    ? talhao
    : undefined;

  return (
    <>
      <Link
        href="/colheitas"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-3 hover:text-ink"
      >
        <ChevronLeft className="size-4" /> Colheitas
      </Link>
      <PageHeader
        rotulo="safra"
        titulo="Nova colheita"
        descricao="Registre o que foi colhido e anote as condições do dia."
      />
      <div className="mx-auto max-w-xl rounded-[10px] border border-line bg-surface p-5 sm:p-8">
        <ColheitaForm
          acao={criarColheita}
          talhoes={talhoes.map((t) => ({
            id: t.id,
            nome: t.nome,
            fazendaNome: t.fazenda.nome,
            areaHa: t.areaHa,
          }))}
          talhaoSelecionado={talhaoPreselecionado}
        />
      </div>
    </>
  );
}