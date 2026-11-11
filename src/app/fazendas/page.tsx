import Link from "next/link";
import { Plus, Sprout } from "lucide-react";
import { prisma } from "@/lib/db";
import { fmtCount, fmtHa, fmtTarefas } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { SelecionarDono } from "@/components/selecionar-dono";
import { definirProprietario } from "@/lib/actions";
import { userIdAtual } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function FazendasPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;
  const userId = await userIdAtual();

  const where =
    estado === "inativas"
      ? { userId, ativa: false }
      : estado === "ativas"
        ? { userId, ativa: true }
        : { userId };

  const [fazendas, donos] = await Promise.all([
    prisma.fazenda.findMany({
      where,
      include: {
        talhoes: { select: { id: true, areaHa: true } },
        proprietario: { select: { nome: true } },
      },
      orderBy: { nome: "asc" },
    }),
    prisma.proprietario.findMany({
      where: { userId },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  const areaColhivel = fazendas.reduce(
    (acc, f) => acc + f.talhoes.reduce((a, t) => a + t.areaHa, 0),
    0,
  );

  const filtros = [
    { id: "", rotulo: "Todas" },
    { id: "ativas", rotulo: "Ativas" },
    { id: "inativas", rotulo: "Inativas" },
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
            estado === "inativas"
              ? "Nenhuma fazenda inativa"
              : "Nenhuma fazenda ainda"
          }
          descricao={
            estado === "inativas"
              ? "Quando venda/entregue uma fazenda, desmarque 'Ativa' e ela aparecerá aqui (arquivada)."
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
                <li key={f.id} className="flex items-center gap-2">
                  <Link
                    href={`/fazendas/${f.id}`}
                    className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-lg py-3 pl-2 pr-1 transition-colors hover:bg-surface-muted"
                  >
                    <span className="grid min-w-0 gap-0.5">
                      <span className="truncate text-[0.9375rem] font-semibold text-ink">
                        {f.nome}
                      </span>
                      <span className="flex flex-wrap items-center gap-x-2 text-xs text-ink-3">
                        {f.proprietario && (
                          <>
                            <span className="font-medium text-ink-2">{f.proprietario.nome}</span>
                            <span aria-hidden>·</span>
                          </>
                        )}
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
                      </span>
                    </span>
                    <span className="tnum shrink-0 text-[0.9375rem] font-bold text-ink">
                      {fmtHa(area)}
                    </span>
                  </Link>
                  {donos.length > 0 && (
                    <SelecionarDono
                      fazendaId={f.id}
                      atual={f.proprietarioId}
                      donos={donos}
                      definir={definirProprietario}
                      ariaLabel={`Proprietário de ${f.nome}`}
                    />
                  )}
                </li>
              );
            })}
          </ul>
          {donos.length > 0 && (
            <p className="px-1 text-xs text-ink-3">
              Escolha o dono de cada fazenda no quadro ao lado do nome — salva na hora.
            </p>
          )}
          <p className="px-1 text-xs text-ink-3">
            {fmtCount(fazendas.length)} fazendas · {fmtHa(areaColhivel)} em talhões (
            {fmtTarefas(areaColhivel)})
          </p>
        </div>
      )}
    </>
  );
}