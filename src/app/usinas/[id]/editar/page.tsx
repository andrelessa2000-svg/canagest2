import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { atualizarUsina } from "@/lib/actions";
import { PageHeader } from "@/components/page-header";
import { UsinaForm } from "@/components/usina-form";

export const dynamic = "force-dynamic";

export default async function EditarUsinaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const usina = await prisma.usina.findUnique({ where: { id } });
  if (!usina) notFound();

  return (
    <>
      <Link
        href="/usinas"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-3 hover:text-ink"
      >
        <ChevronLeft className="size-4" /> Usinas
      </Link>
      <PageHeader
        rotulo="cadastro"
        titulo="Editar usina"
        descricao="Atualize o nome ou o modelo de remuneração."
      />
      <div className="mx-auto max-w-xl rounded-[10px] border border-line bg-surface p-5 sm:p-8">
        <UsinaForm
          acao={atualizarUsina.bind(null, id)}
          inicial={{ nome: usina.nome, modelo: usina.modelo }}
        />
      </div>
    </>
  );
}