import Link from "next/link";
import { Check, Pencil, Plus, Sprout } from "lucide-react";
import { prisma } from "@/lib/db";
import { fmtCount, fmtDate, fmtMoney } from "@/lib/format";
import { ESCOPOS_TRATO_LABEL, TIPOS_TRATO_LABEL } from "@/lib/validators";
import { concretizarTrato, excluirTrato } from "@/lib/actions";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDelete } from "@/components/confirm-delete";

export const dynamic = "force-dynamic";

export default async function TratosPage({
  searchParams,
}: {
  searchParams: Promise<{ reg?: string }>;
}) {
  const { reg } = await searchParams;
  const tratos = await prisma.trato.findMany({
    where:
      reg === "proj" ? { projecao: true } : reg === "real" ? { projecao: false } : {},
    include: {
      fazenda: { select: { nome: true } },
      talhao: { select: { nome: true } },
    },
    orderBy: [{ data: "desc" }, { criadaEm: "desc" }],
  });

  const total = tratos.reduce((acc, t) => acc + t.valor, 0);

  const regs = [
    { id: "", rotulo: "Caderno de campo" },
    { id: "proj", rotulo: "Projeções" },
  ];

  return (
    <>
      <PageHeader
        rotulo="cultivos"
        titulo="Tratos culturais"
        descricao="Adubação, herbicida, inseticida e mais — escopo por fazenda, talhão ou parte."
        acao={
          <Link href="/tratos/nova" className="btn btn-primary">
            <Plus className="size-4" /> Novo trato
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1">
        {regs.map((r) => (
          <Link
            key={r.id}
            href={`/tratos${r.id ? `?reg=${r.id}` : ""}`}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              (reg ?? "") === r.id ? "bg-accent text-surface" : "bg-surface-muted text-ink-2"
            }`}
          >
            {r.rotulo}
          </Link>
        ))}
      </div>

      {tratos.length === 0 ? (
        <EmptyState
          icone={Sprout}
          titulo="Nenhum trato ainda"
          descricao="Registre os tratos culturais para descontá-los do lucro no relatório."
          ctaTexto="Registrar trato"
          ctaHref="/tratos/nova"
        />
      ) : (
        <div className="grid gap-3">
          <ul className="divide-y divide-line rounded-[10px] border border-line bg-surface px-3">
            {tratos.map((t) => {
              const produtos = (t.produtos ?? []) as { nome?: string }[];
              const nProd = produtos.filter((p) => p.nome).length;
              return (
                <li key={t.id} className="-mx-2 flex items-center gap-2 px-2 py-3">
                  <span className="grid min-w-0 flex-1 gap-0.5">
                    <span className="truncate text-sm font-medium text-ink">
                      {TIPOS_TRATO_LABEL[t.tipo] ?? t.tipo}
                      <span className="font-normal text-ink-2"> · {t.fazenda.nome}</span>
                    </span>
                    <span className="flex flex-wrap items-center gap-x-2 text-xs text-ink-3">
                      <span>{fmtDate(t.data)}</span>
                      <span aria-hidden>·</span>
                      <span>{ESCOPOS_TRATO_LABEL[t.escopo] ?? t.escopo}</span>
                      {t.projecao && (
                        <>
                          <span className="rounded-md border border-dashed border-line-strong bg-accent-soft px-1.5 py-0.5 font-semibold text-accent-strong">
                            Projeção
                          </span>
                          {t.data < new Date() && (
                            <span className="rounded-md border border-dashed border-danger-strong/40 bg-danger-soft px-1.5 py-0.5 font-semibold text-danger-strong">
                              Vencida
                            </span>
                          )}
                        </>
                      )}
                      {t.talhao && (
                        <>
                          <span aria-hidden>·</span>
                          <span>Talhão {t.talhao.nome}</span>
                        </>
                      )}
                      {t.tarefas && (
                        <>
                          <span aria-hidden>·</span>
                          <span>{fmtCount(t.tarefas)} tarefas</span>
                        </>
                      )}
                      {nProd > 0 && (
                        <>
                          <span aria-hidden>·</span>
                          <span>{nProd} {nProd === 1 ? "produto" : "produtos"}</span>
                        </>
                      )}
                      {t.safra && (
                        <>
                          <span aria-hidden>·</span>
                          <span>Safra {t.safra}</span>
                        </>
                      )}
                    </span>
                  </span>
                  <span className="tnum text-sm font-semibold text-ink">{fmtMoney(t.valor)}</span>
                  {t.projecao && (
                    <form action={concretizarTrato.bind(null, t.id)}>
                      <button
                        type="submit"
                        className="inline-flex size-9 items-center justify-center rounded-lg border border-transparent text-accent transition-colors hover:border-accent hover:bg-accent-soft"
                        aria-label="Concretizar trato"
                        title="Marcar como realizado"
                      >
                        <Check className="size-4" />
                      </button>
                    </form>
                  )}
                  <Link
                    href={`/tratos/${t.id}/editar`}
                    className="inline-flex size-9 items-center justify-center rounded-lg border border-transparent text-ink-3 transition-colors hover:border-line-strong hover:bg-surface-muted hover:text-ink"
                    aria-label="Editar trato"
                  >
                    <Pencil className="size-4" />
                  </Link>
                  <ConfirmDelete
                    action={excluirTrato.bind(null, t.id)}
                    titulo="Excluir trato?"
                    mensagem={`O registro de ${fmtMoney(t.valor)} de ${fmtDate(t.data)} será apagado.`}
                    verbo="Excluir"
                    modo="stay"
                  />
                </li>
              );
            })}
          </ul>
          <p className="px-1 text-xs text-ink-3">
            {fmtCount(tratos.length)} {tratos.length === 1 ? "registro" : "registros"} ·{" "}
            {fmtMoney(total)} no total
          </p>
        </div>
      )}
    </>
  );
}