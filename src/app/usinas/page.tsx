import Link from "next/link";
import { Factory, Pencil, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { fmtCount } from "@/lib/format";
import { MODELO_USINA_LABEL, type ModeloUsina } from "@/lib/colheita";
import { excluirUsina } from "@/lib/actions";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDelete } from "@/components/confirm-delete";

export const dynamic = "force-dynamic";

export default async function UsinasPage() {
  const usinas = await prisma.usina.findMany({
    include: { _count: { select: { colheitas: true } } },
    orderBy: { nome: "asc" },
  });

  return (
    <>
      <PageHeader
        rotulo="cadastro"
        titulo="Usinas"
        descricao="As usinas que recebem a cana, com o modelo de remuneração de cada uma."
        acao={
          <Link href="/usinas/nova" className="btn btn-primary">
            <Plus className="size-4" /> Nova usina
          </Link>
        }
      />

      {usinas.length === 0 ? (
        <EmptyState
          icone={Factory}
          titulo="Nenhuma usina ainda"
          descricao="Cadastre uma usina para poder registrar colheitas com remuneração."
          ctaTexto="Cadastrar usina"
          ctaHref="/usinas/nova"
        />
      ) : (
        <div className="grid gap-3">
          <ul className="divide-y divide-line rounded-[10px] border border-line bg-surface px-3">
            {usinas.map((u) => (
              <li key={u.id} className="-mx-2 flex items-center gap-2 px-2 py-3">
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="truncate text-sm font-medium text-ink">{u.nome}</span>
                  <span className="flex flex-wrap items-center gap-x-2 text-xs text-ink-3">
                    <span className="rounded-md bg-surface-muted px-1.5 py-0.5 font-semibold text-ink-2">
                      {MODELO_USINA_LABEL[u.modelo as ModeloUsina] ?? u.modelo}
                    </span>
                    <span aria-hidden>·</span>
                    <span>
                      {u._count.colheitas} {u._count.colheitas === 1 ? "colheita" : "colheitas"}
                    </span>
                  </span>
                </span>
                <Link
                  href={`/usinas/${u.id}/editar`}
                  className="inline-flex size-9 items-center justify-center rounded-lg border border-transparent text-ink-3 transition-colors hover:border-line-strong hover:bg-surface-muted hover:text-ink"
                  aria-label="Editar usina"
                >
                  <Pencil className="size-4" />
                </Link>
                <ConfirmDelete
                  action={excluirUsina.bind(null, u.id)}
                  titulo="Excluir usina?"
                  mensagem={`A usina "${u.nome}" será apagada. Isso só é possível se não houver colheitas vinculadas a ela.`}
                  verbo="Excluir"
                  modo="stay"
                />
              </li>
            ))}
          </ul>
          <p className="px-1 text-xs text-ink-3">
            {fmtCount(usinas.length)} {usinas.length === 1 ? "usina" : "usinas"} cadastradas
          </p>
        </div>
      )}
    </>
  );
}