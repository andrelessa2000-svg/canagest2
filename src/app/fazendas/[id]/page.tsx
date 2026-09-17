import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil, Plus, Sprout } from "lucide-react";
import { prisma } from "@/lib/db";
import {
  fmtArea,
  fmtCount,
  fmtDateShort,
  fmtProd,
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

  const [fazenda, colheitas] = await Promise.all([
    prisma.fazenda.findUnique({
      where: { id },
      include: {
        talhoes: {
          include: {
            colheitas: { orderBy: { data: "desc" }, take: 1 },
          },
          orderBy: { nome: "asc" },
        },
      },
    }),
    prisma.colheita.findMany({
      where: { talhao: { fazendaId: id } },
      include: { talhao: true },
      orderBy: { data: "desc" },
      take: 5,
    }),
  ]);

  if (!fazenda) notFound();

  const areaPlantada = fazenda.talhoes.reduce((n, t) => n + t.areaHa, 0);
  const colhido = fazenda.talhoes.reduce(
    (n, t) => n + t.colheitas.reduce((m, c) => m + c.toneladas, 0),
    0,
  );
  const numColheitas = fazenda.talhoes.reduce((n, t) => n + t.colheitas.length, 0);

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
        descricao={[fazenda.cidade, fazenda.uf].filter(Boolean).join(" · ")}
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
          valor={fmtArea(areaPlantada)}
          legenda={`de ${fmtArea(fazenda.areaTotalHa)} totais`}
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
            descricao="Divida a fazenda em talhões para registrar a variedade, a área e as colheitas."
            ctaTexto="Cadastrar talhão"
            ctaHref={`/fazendas/${fazenda.id}/talhoes/novo`}
          />
        ) : (
          <>
            <ul className="divide-y divide-line rounded-[10px] border border-line bg-surface px-3">
              {fazenda.talhoes.map((t) => {
                const ultima = t.colheitas[0];
                return (
                  <LinhaLink
                    key={t.id}
                    href={`/talhoes/${t.id}`}
                    principal={
                      <span className="font-mono font-semibold tracking-wide">
                        {t.nome}
                      </span>
                    }
                    secundario={
                      <>
                        {t.variedade ? (
                          <>
                            <span>{t.variedade}</span>
                            <span aria-hidden>·</span>
                          </>
                        ) : null}
                        <span>{fmtArea(t.areaHa)}</span>
                        {ultima && (
                          <>
                            <span aria-hidden>·</span>
                            <span>
                              Última colheita {fmtDateShort(ultima.data)} ·{" "}
                              {fmtTons(ultima.toneladas)}
                            </span>
                          </>
                        )}
                      </>
                    }
                  />
                );
              })}
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
            href={`/colheitas/nova?talhao=${fazenda.talhoes[0]?.id ?? ""}`}
            className={`inline-flex items-center gap-1 text-sm font-medium ${
              fazenda.talhoes.length > 0
                ? "text-accent hover:text-accent-strong"
                : "pointer-events-none text-ink-3"
            }`}
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
                href={`/talhoes/${c.talhaoId}`}
                principal={`Talhão ${c.talhao.nome}`}
                secundario={
                  <>
                    <span>{fmtDateShort(c.data)}</span>
                    <span aria-hidden>·</span>
                    <span>{tipoLabel(c.tipo)}</span>
                  </>
                }
                destaque={fmtTons(c.toneladas)}
                nota={fmtProd(c.toneladas / c.talhao.areaHa)}
              />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}