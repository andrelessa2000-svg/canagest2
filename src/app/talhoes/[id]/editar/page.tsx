import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { atualizarTalhao } from "@/lib/actions";
import { toDateInputValue } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { TalhaoForm } from "@/components/talhao-form";

export const dynamic = "force-dynamic";

export default async function EditarTalhaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const talhao = await prisma.talhao.findUnique({
    where: { id },
    include: { fazenda: { select: { nome: true } } },
  });
  if (!talhao) notFound();

  return (
    <>
      <Link
        href={`/talhoes/${id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-3 hover:text-ink"
      >
        <ChevronLeft className="size-4" /> Talhão {talhao.nome}
      </Link>
      <PageHeader
        rotulo="cadastro"
        titulo="Editar talhão"
        descricao="Atualize os dados da área plantada."
      />
      <div className="mx-auto max-w-xl rounded-[10px] border border-line bg-surface p-5 sm:p-8">
        <TalhaoForm
          acao={atualizarTalhao.bind(null, id)}
          nomeFazenda={talhao.fazenda.nome}
          inicial={{
            nome: talhao.nome,
            variedade: talhao.variedade ?? "",
            area: talhao.areaHa,
            dataPlantio: talhao.dataPlantio
              ? toDateInputValue(talhao.dataPlantio)
              : "",
          }}
        />
      </div>
    </>
  );
}