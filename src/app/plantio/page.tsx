import Link from "next/link";
import { Check, Pencil, Plus, Sprout } from "lucide-react";
import { prisma } from "@/lib/db";
import { fmtCount, fmtDate, fmtMoney } from "@/lib/format";
import { TIPOS_PLANTIO_LABEL } from "@/lib/validators";
import { concretizarPlantio, excluirPlantio } from "@/lib/actions";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDelete } from "@/components/confirm-delete";

export const dynamic = "force-dynamic";

export default async function PlantioPage({
  searchParams,
}: {
  searchParams: Promise<{ reg?: string }>;
}) {
  const { reg } = await searchParams;
  const plantios = await prisma.plantio.findMany({
    where:
      reg === "proj" ? { projecao: true } : reg === "real" ? { projecao: false } : {},
    include: {
      fazenda: { select: { nome: true } },
      talhao: { select: { nome: true } },
    },
    orderBy: [{ data: "desc" }, { criadaEm: "desc" }],
  });

  const total = plantios.reduce((acc, p) => acc + p.valor, 0);

  const regs = [
    { id: "", rotulo: "Caderno de campo" },
    { id: "proj", rotulo: "Projeções" },
  ];

  return (
    <>
      <PageHeader
        rotulo="cultivos"
        titulo="Plantio"
        descricao="Custos de plantio e reforma por fazenda — não geran receita."
        acao={
          <Link href="/plantio/nova" className="btn btn-primary">
            <Plus className="size-4" /> Novo plantio
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1">
        {regs.map((r) => (
          <Link
            key={r.id}
            href={`/plantio${r.id ? `?reg=${r.id}` : ""}`}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              (reg ?? "") === r.id ? "bg-accent text-surface" : "bg-surface-muted text-ink-2"
            }`}
          >
            {r.rotulo}
          </Link>
        ))}
      </div>

      {plantios.length === 0 ? (
        <EmptyState
          icone={Sprout}
          titulo="Nenhum plantio ainda"
          descricao="Registre o plantio e reforma do ano para acompanhar o custo por fazenda."
          ctaTexto="Registrar plantio"
          ctaHref="/plantio/nova"
        />
      ) : (
        <div className="grid gap-3">
          <ul className="divide-y divide-line rounded-[10px] border border-line bg-surface px-3">
            {plantios.map((p) => (
              <li key={p.id} className="-mx-2 flex items-center gap-2 px-2 py-3">
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="truncate text-sm font-medium text-ink">
                    {p.fazenda.nome}
                    {p.talhao && (
                      <span className="font-normal text-ink-2"> · Talhão {p.talhao.nome}</span>
                    )}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-2 text-xs text-ink-3">
                    <span>{fmtDate(p.data)}</span>
                    <span aria-hidden>·</span>
                    <span className="rounded-md bg-surface-muted px-1.5 py-0.5 font-semibold text-ink-2">
                      {TIPOS_PLANTIO_LABEL[p.tipo] ?? p.tipo}
                    </span>
                    {p.projecao && (
                      <span className="rounded-md border border-dashed border-line-strong bg-accent-soft px-1.5 py-0.5 font-semibold text-accent-strong">
                        Projeção
                      </span>
                    )}
                    {p.safra && (
                      <>
                        <span aria-hidden>·</span>
                        <span>Safra {p.safra}</span>
                      </>
                    )}
                  </span>
                </span>
                <span className="tnum text-sm font-semibold text-ink">
                  {fmtMoney(p.valor)}
                </span>
                {p.projecao && (
                  <form action={concretizarPlantio.bind(null, p.id)}>
                    <button
                      type="submit"
                      className="inline-flex size-9 items-center justify-center rounded-lg border border-transparent text-accent transition-colors hover:border-accent hover:bg-accent-soft"
                      aria-label="Concretizar plantio"
                      title="Marcar como realizado"
                    >
                      <Check className="size-4" />
                    </button>
                  </form>
                )}
                <Link
                  href={`/plantio/${p.id}/editar`}
                  className="inline-flex size-9 items-center justify-center rounded-lg border border-transparent text-ink-3 transition-colors hover:border-line-strong hover:bg-surface-muted hover:text-ink"
                  aria-label="Editar plantio"
                >
                  <Pencil className="size-4" />
                </Link>
                <ConfirmDelete
                  action={excluirPlantio.bind(null, p.id)}
                  titulo="Excluir plantio?"
                  mensagem={`O registro de ${fmtMoney(p.valor)} de ${fmtDate(p.data)} será apagado.`}
                  verbo="Excluir"
                  modo="stay"
                />
              </li>
            ))}
          </ul>
          <p className="px-1 text-xs text-ink-3">
            {fmtCount(plantios.length)} {plantios.length === 1 ? "registro" : "registros"} ·{" "}
            {fmtMoney(total)} no total
          </p>
        </div>
      )}
    </>
  );
}