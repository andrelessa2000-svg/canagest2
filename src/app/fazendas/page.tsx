import Link from "next/link";
import { Plus, Sprout } from "lucide-react";
import { prisma } from "@/lib/db";
import { fmtCount, fmtHa, fmtTarefas } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { LinhaLink } from "@/components/stat-cells";

export const dynamic = "force-dynamic";

export default async function FazendasPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;

  const where =
    estado === "inactivas" ? { ativa: false } : estado === "ativas" ? { ativa: true } : {};

  const fazendas = await prisma.fazenda.findMany({
    where,
    include: { talhoes: { select: { id: true, areaHa: true } } },
    orderBy: { nome: "asc" },
  });

  const areaColhivel = fazendas.reduce(
    (acc, f) => acc + f.talhoes.reduce((a, t) => a + t.areaHa, 0),
    0,
  );

  const filtros = [
    { id: "", rotulo: "Todas" },
    { id: "ativas", rotulo: "Ativas" },
    { id: "inactivas", rotulo: "Inactivas" },
  ];

  return (
    <>
      <PageHeader
        rotulo="cadastro"
        titulo="Fazendas"
        descricao="As unidades produtoras cadastradas no seu caderno de campo."
        acao={
          <Link href="/fazendas/nova" className="btn btn-primary">
            <Plus className="size-4" /> Nova fazenda
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1">
        {filtros.map((r) => (
          <Link
            key={r.id}
            href={`/fazendas${r.id ? `?estado=${r.id}` : ""}`}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              (estado ?? "") === r.id ? "bg-accent text-surface" : "bg-surface-muted text-ink-2"
            }`}
          >
            {r.rotulo}
          </Link>
        ))}
      </div>

      {fazendas.length === 0 ? (
        <EmptyState
          icone={Sprout}
          titulo={
            estado === "inactivas"
              ? "Nenhuma fazenda inactiva"
              : "Nenhuma fazenda ainda"
          }
          descricao={
            estado === "inactivas"
              ? "Quando venda/entregue uma fazenda, desmarque 'Ativa' e ela aparecerá aqui (archivada)."
              : "Cadastre a primeira fazenda para começar a estruturar seus talhões."
          }
          ctaTexto={estado ? undefined : "Cadastrar fazenda"}
          ctaHref={estado ? undefined : "/fazendas/nova"}
        />
      ) : (
        <div className="grid gap-3">
          <ul className="divide-y divide-line rounded-[10px] border border-line bg-surface px-3">
            {fazendas.map((f) => {
              const area = f.talhoes.reduce((a, t) => a + t.areaHa, 0);
              return (
                <LinhaLink
                  key={f.id}
                  href={`/fazendas/${f.id}`}
                  principal={f.nome}
                  secundario={
                    <>
                      <span>
                        {f.talhoes.length}
                        {f.talhoes.length === 1 ? " talhão" : " talhões"}
                      </span>
                      <span aria-hidden>·</span>
                      <span>{fmtTarefas(area)}</span>
                      {!f.ativa && (
                        <span className="rounded-md border border-dashed border-line-strong bg-surface-muted px-1.5 py-0.5 font-semibold text-ink-2">
                          Inactiva
                        </span>
                      )}
                    </>
                  }
                  destaque={fmtHa(area)}
                />
              );
            })}
          </ul>
          <p className="px-1 text-xs text-ink-3">
            {fmtCount(fazendas.length)} fazendas · {fmtHa(areaColhivel)} em talhões (
            {fmtTarefas(areaColhivel)})
          </p>
        </div>
      )}
    </>
  );
}