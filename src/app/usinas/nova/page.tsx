import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { criarUsina } from "@/lib/actions";
import { PageHeader } from "@/components/page-header";
import { UsinaForm } from "@/components/usina-form";

export default async function NovaUsinaPage() {
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
        titulo="Nova usina"
        descricao="Cadastre a usina e o modelo de remuneração usado por ela."
      />
      <div className="mx-auto max-w-xl rounded-[10px] border border-line bg-surface p-5 sm:p-8">
        <UsinaForm acao={criarUsina} />
      </div>
    </>
  );
}