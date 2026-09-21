import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";
import { prisma } from "@/lib/db";
import { fmtArea, fmtHa, fmtTarefas } from "@/lib/format";
import { excluirTalhao } from "@/lib/actions";
import { PageHeader } from "@/components/page-header";
import { ConfirmDelete } from "@/components/confirm-delete";
import { CelulaMetrica, GradeMetricas } from "@/components/stat-cells";

export const dynamic = "force-dynamic";

export default async function TalhaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const talhao = await prisma.talhao.findUnique({
    where: { id },
    include: {
      fazenda: { select: { id: true, nome: true } },
    },
  });

  if (!talhao) notFound();

  return (
    <>
      <Link
        href={`/fazendas/${talhao.fazendaId}`}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-3 hover:text-ink"
      >
        <ChevronLeft className="size-4" /> {talhao.fazenda.nome}
      </Link>

      <PageHeader
        rotulo="talhão · cadastro"
        titulo={talhao.nome}
        descricao={fmtArea(talhao.areaHa)}
        acao={
          <>
            <Link
              href={`/talhoes/${talhao.id}/editar`}
              className="inline-flex size-9 items-center justify-center rounded-lg border border-line text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
              aria-label="Editar talhão"
            >
              <Pencil className="size-4" />
            </Link>
            <ConfirmDelete
              action={excluirTalhao.bind(null, talhao.id)}
              titulo="Excluir talhão?"
              mensagem={` " ${talhao.nome} " será apagado. Essa ação não pode ser desfeita.`}
              verbo="Excluir"
            />
          </>
        }
      />

      <GradeMetricas>
        <CelulaMetrica
          rotulo="Área"
          valor={fmtHa(talhao.areaHa)}
          legenda={`${fmtTarefas(talhao.areaHa)}`}
        />
      </GradeMetricas>
      <p className="mt-6 text-sm leading-relaxed text-ink-2">
        As colheitas se registran por fazenda (a usina passa o relatório da fazenda,
        não de cada talhão). Veja o histórico no cadastro da fazenda.
      </p>
    </>
  );
}