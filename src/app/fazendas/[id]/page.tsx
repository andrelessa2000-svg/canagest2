import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil, Plus, Sprout } from "lucide-react";
import { prisma } from "@/lib/db";
import {
  fmtArea,
  fmtCount,
  fmtDateShort,
  fmtHa,
  fmtProd,
  fmtTarefas,
  fmtTons,
} from "@/lib/format";
import { tipoLabel } from "@/lib/validators";
import { excluirFazenda } from "@/lib/actions";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDelete } from "@/components/confirm-delete";
import { CelulaMetrica, GradeMetricas, LinhaLink } from "@/components/stat-cells";

export const dynamic = "force-dynamic";

export default async function FazendaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [fazenda, colheitas, resumen] = await Promise.all([
    prisma.fazenda.findUnique({
      where: { id },
      include: {
        talhoes: {
          orderBy: { nome: "asc" },
        },
      },
    }),
    prisma.colheita.findMany({
      where: { fazendaId: id },
      include: { usina: { select: { nome: true } } },
      orderBy: { data: "desc" },
      take: 5,
    }),
    prisma.colheita.aggregate({
      where: { fazendaId: id },
      _sum: { toneladas: true },
      _count: true,
    }),
  ]);

  if (!fazenda) notFound();

  const areaPlantada = fazenda.talhoes.reduce((n, t) => n + t.areaHa, 0);
  const colhido = resumen._sum.toneladas ?? 0;
  const numColheitas = resumen._count;

  return (
    <>
      <Link
        href="/fazendas"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-3 hover:text-ink"
      >
        <ChevronLeft className="size-4" /> Fazendas
      </Link>

      <PageHeader
        rotulo="fazenda"
        titulo={fazenda.nome}
        descricao={
          fazenda.talhoes.length > 0
            ? `${fazenda.talhoes.length} ${
                fazenda.talhoes.length === 1 ? "talhão" : "talhões"
              } · ${fmtArea(areaPlantada)}`
            : "Nenhum talhão cadastrado ainda."
        }
        acao={
          <>
            <Link
              href={`/fazendas/${fazenda.id}/editar`}
              className="inline-flex size-9 items-center justify-center rounded-lg border border-line text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
              aria-label="Editar fazenda"
            >
              <Pencil className="size-4" />
            </Link>
            <ConfirmDelete
              action={excluirFazenda.bind(null, fazenda.id)}
              titulo="Excluir fazenda?"
              mensagem={` "${fazenda.nome}" e todos os seus talhões e colheitas serão apagados. Essa ação não pode ser desfeita.`}
              verbo="Excluir"
            />
            <Link href={`/fazendas/${fazenda.id}/talhoes/novo`} className="btn btn-primary">
              <Plus className="size-4" /> Novo talhão
            </Link>
          </>
        }
      />

      <GradeMetricas>
        <CelulaMetrica
          rotulo="Talhões"
          valor={fmtCount(fazenda.talhoes.length)}
          legenda="cadastrados"
        />
        <CelulaMetrica
          rotulo="Área plantada"
          valor={fmtHa(areaPlantada)}
          legenda={`${fmtTarefas(areaPlantada)} somadas`}
        />
        <CelulaMetrica
          rotulo="Colhido"
          valor={fmtTons(colhido)}
          legenda={`${fmtCount(numColheitas)} registros`}
        />
        <CelulaMetrica
          rotulo="Produtividade"
          valor={fmtProd(areaPlantada > 0 ? colhido / areaPlantada : 0)}
          legenda="média colhida"
        />
      </GradeMetricas>

      <section className="mt-10 grid gap-3">
        <h2 className="font-display text-xl text-ink">Talhões</h2>

        {fazenda.talhoes.length === 0 ? (
          <EmptyState
            icone={Sprout}
            titulo="Nenhum talhão cadastrado"
            descricao="Divida a fazenda em talhões para registrar a área e as colheitas."
            ctaTexto="Cadastrar talhão"
            ctaHref={`/fazendas/${fazenda.id}/talhoes/novo`}
          />
        ) : (
          <>
            <ul className="divide-y divide-line rounded-[10px] border border-line bg-surface px-3">
              {fazenda.talhoes.map((t) => (
                <LinhaLink
                  key={t.id}
                  href={`/talhoes/${t.id}`}
                  principal={
                    <span className="font-mono font-semibold tracking-wide">
                      {t.nome}
                    </span>
                  }
                  secundario={<span>{fmtArea(t.areaHa)}</span>}
                />
              ))}
            </ul>
            <Link
              href={`/fazendas/${fazenda.id}/talhoes/novo`}
              className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-strong"
            >
              <Plus className="size-4" /> Cadastrar outro talhão
            </Link>
          </>
        )}
      </section>

      <section className="mt-10 grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-ink">Últimas colheitas</h2>
          <Link
            href={`/colheitas/nova?fazenda=${fazenda.id}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-strong"
          >
            Registrar <Plus className="size-4" />
          </Link>
        </div>

        {colheitas.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line-strong bg-surface/60 px-4 py-6 text-sm text-ink-2">
            Ainda não há colheitas registradas para esta fazenda.
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-[10px] border border-line bg-surface px-3">
            {colheitas.map((c) => (
              <LinhaLink
                key={c.id}
                href={`/colheitas/${c.id}`}
                principal={`${fmtDateShort(c.data)} · ${c.usina.nome}`}
                secundario={
                  <>
                    <span>{tipoLabel(c.tipo)}</span>
                  </>
                }
                destaque={fmtTons(c.toneladas)}
                nota={fmtProd(
                  areaPlantada > 0 ? c.toneladas / areaPlantada : 0,
                )}
              />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}