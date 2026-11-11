import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { FazendaForm } from "@/components/fazenda-form";
import { criarFazenda } from "@/lib/actions";
import { prisma } from "@/lib/db";
import { userIdAtual } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NovaFazendaPage() {
  const proprietarios = await prisma.proprietario.findMany({
    where: { userId: await userIdAtual() },
    select: { id: true, nome: true },
    orderBy: { nome: "asc" },
  });
  return (
    <>
      <Link
        href="/fazendas"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-3 hover:text-ink"
      >
        <ChevronLeft className="size-4" /> Fazendas
      </Link>
      <PageHeader
        rotulo="cadastro"
        titulo="Nova fazenda"
        descricao="Informe os dados básicos da propriedade."
      />
      <div className="mx-auto max-w-xl rounded-[10px] border border-line bg-surface p-5 sm:p-8">
        <FazendaForm acao={criarFazenda} proprietarios={proprietarios} />
      </div>
    </>
  );
}