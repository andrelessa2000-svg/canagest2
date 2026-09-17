import Link from "next/link";
import { Plus, Sprout } from "lucide-react";
import { prisma } from "@/lib/db";
import { fmtDate, fmtProd, fmtTons } from "@/lib/format";
import { tipoLabel } from "@/lib/validators";
import { excluirColheita } from "@/lib/actions";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDelete } from "@/components/confirm-delete";

export const dynamic = "force-dynamic";

export default async function ColheitasPage() {
  const colheitas = await prisma.colheita.findMany({
    include: { talhao: { include: { fazenda: true } } },
    orderBy: [{ data: "desc" }, { criadaEm: "desc" }],
  });

  const total = colheitas.reduce((n, c) => n + c.toneladas, 0);

  return (
    <>
      <PageHeader
        rotulo="safra"
        titulo="Colheitas"
        descricao="Todas as colheitas registradas, da mais recente para a mais antiga."
        acao={
          <Link href="/colheitas/nova" className="btn btn-primary">
            <Plus className="size-4" /> Nova colheita
          </Link>
        }
      />

      {colheitas.length === 0 ? (
        <EmptyState
          icone={Sprout}
          titulo="Nenhuma colheita ainda"
          descricao="Registre a primeira colheita de um talhão para começar o histórico da safra."
          ctaTexto="Registrar colheita"
          ctaHref="/colheitas/nova"
        />
      ) : (
        <div className="grid gap-3">
          <ul className="divide-y divide-line rounded-[10px] border border-line bg-surface px-3">
            {colheitas.map((c) => (
              <li
                key={c.id}
                className="-mx-2 flex items-center justify-between gap-3 px-2 py-3"
              >
                <Link
                  href={`/talhoes/${c.talhaoId}`}
                  className="grid min-w-0 gap-0.5"
                >
                  <span className="truncate text-sm font-medium text-ink">
                    Talhão {c.talhao.nome}
                    <span className="font-normal text-ink-2"> · {c.talhao.fazenda.nome}</span>
                  </span>
                  <span className="flex flex-wrap items-center gap-x-2 text-xs text-ink-3">
                    <span>{fmtDate(c.data)}</span>
                    <span aria-hidden>·</span>
                    <span className="rounded-md bg-surface-muted px-1.5 py-0.5 font-semibold text-ink-2">
                      {tipoLabel(c.tipo)}
                    </span>
                    <span aria-hidden>·</span>
                    <span>{fmtProd(c.toneladas / c.talhao.areaHa)}</span>
                  </span>
                </Link>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="tnum text-sm font-semibold text-ink">
                    {fmtTons(c.toneladas)}
                  </span>
                  <ConfirmDelete
                    action={excluirColheita.bind(null, c.id)}
                    titulo="Excluir colheita?"
                    mensagem={`O registro de ${fmtTons(c.toneladas)} de ${fmtDate(c.data)} será apagado.`}
                    verbo="Excluir"
                    modo="stay"
                  />
                </span>
              </li>
            ))}
          </ul>
          <p className="px-1 text-xs text-ink-3">
            {colheitas.length} {colheitas.length === 1 ? "registro" : "registros"} ·{" "}
            {fmtTons(total)} no total
          </p>
        </div>
      )}
    </>
  );
}