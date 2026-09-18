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
  const [{ talhao }, talhoes, usinas] = await Promise.all([
    searchParams,
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
        descricao="Registre a produção, a remuneração e as despesas. O resultado é calculado na hora."
      />
      <div className="mx-auto max-w-3xl">
        {usinas.length === 0 ? (
          <p className="rounded-[10px] border border-dashed border-line-strong bg-surface/60 px-6 py-10 text-center text-sm text-ink-2">
            Nenhuma usina cadastrada. Cadastre uma usina antes de registrar colheitas.
          </p>
        ) : (
          <ColheitaForm
            acao={criarColheita}
            talhoes={talhoes.map((t) => ({
              id: t.id,
              nome: t.nome,
              areaHa: t.areaHa,
              fazendaId: t.fazendaId,
              fazendaNome: t.fazenda.nome,
            }))}
            usinas={usinas}
            talhaoSelecionado={talhaoPreselecionado}
          />
        )}
      </div>
    </>
  );
}
