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
  searchParams: Promise<{ fazenda?: string; talhao?: string }>;
}) {
  const [{ fazenda, talhao }, fazendasRaw, usinas, talhoes] = await Promise.all([
    searchParams,
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

  const fazendas = fazendasRaw.map((f) => ({
    id: f.id,
    nome: f.nome,
    areaHa: f.talhoes.reduce((a, t) => a + t.areaHa, 0),
  }));

  const fazendaValida = fazendas.some((f) => f.id === fazenda);
  const talhaoPreselecionado = talhoes.some((t) => t.id === talhao)
    ? talhao
    : undefined;

  const inicial = fazendaValida ? { fazendaId: fazenda! } : undefined;

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
        descricao="Registre a produção por fazenda, a remuneração e as despesas. O resultado é calculado na hora."
      />
      <div className="mx-auto max-w-3xl">
        {usinas.length === 0 ? (
          <p className="rounded-[10px] border border-dashed border-line-strong bg-surface/60 px-6 py-10 text-center text-sm text-ink-2">
            Cadastre uma usina antes de registrar colheitas (menu Usinas).
          </p>
        ) : (
          <ColheitaForm
            acao={criarColheita}
            fazendas={fazendas}
            usinas={usinas}
            talhoes={talhoes}
            inicial={inicial}
            talhaoSelecionado={talhaoPreselecionado}
          />
        )}
      </div>
    </>
  );
}