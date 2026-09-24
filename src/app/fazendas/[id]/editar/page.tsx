import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { atualizarFazenda } from "@/lib/actions";
import { PageHeader } from "@/components/page-header";
import { FazendaForm } from "@/components/fazenda-form";

export const dynamic = "force-dynamic";

export default async function EditarFazendaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const fazenda = await prisma.fazenda.findUnique({ where: { id } });
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
        titulo="Editar fazenda"
        descricao="Atualize os dados da propriedade."
      />
      <div className="mx-auto max-w-xl rounded-[10px] border border-line bg-surface p-5 sm:p-8">
        <FazendaForm
          acao={atualizarFazenda.bind(null, id)}
          inicial={{
            nome: fazenda.nome,
            ativa: fazenda.ativa,
          }}
        />
      </div>
    </>
  );
}