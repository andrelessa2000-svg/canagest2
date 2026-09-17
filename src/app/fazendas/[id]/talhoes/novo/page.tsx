import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { criarTalhao } from "@/lib/actions";
import { PageHeader } from "@/components/page-header";
import { TalhaoForm } from "@/components/talhao-form";

export const dynamic = "force-dynamic";

export default async function NovoTalhaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const fazenda = await prisma.fazenda.findUnique({
    where: { id },
    select: { id: true, nome: true },
  });
  if (!fazenda) notFound();

  return (
    <>
      <Link
        href={`/fazendas/${id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-3 hover:text-ink"
      >
        <ChevronLeft className="size-4" /> {fazenda.nome}
      </Link>
      <PageHeader
        rotulo="cadastro"
        titulo="Novo talhão"
        descricao="Identifique a área plantada dentro desta fazenda."
      />
      <div className="mx-auto max-w-xl rounded-[10px] border border-line bg-surface p-5 sm:p-8">
        <TalhaoForm acao={criarTalhao.bind(null, id)} nomeFazenda={fazenda.nome} />
      </div>
    </>
  );
}