import Link from "next/link";
import { ArrowRight, Sprout } from "lucide-react";
import { prisma } from "@/lib/db";
import {
  fmtArea,
  fmtCount,
  fmtDateShort,
  fmtProd,
  fmtTons,
} from "@/lib/format";
import { tipoLabel } from "@/lib/validators";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { CelulaMetrica, GradeMetricas, LinhaLink } from "@/components/stat-cells";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [fazendas, colheitasRecentes, totalColhido] = await Promise.all([
    prisma.fazenda.findMany({
      include: { talhoes: true },
      orderBy: { nome: "asc" },
    }),
    prisma.colheita.findMany({
      include: { talhao: { include: { fazenda: true } } },
      orderBy: { data: "desc" },
      take: 5,
    }),
    prisma.colheita.aggregate({ _sum: { toneladas: true } }),
  ]);

  const numTalhoes = fazendas.reduce((n, f) => n + f.talhoes.length, 0);
  const areaTotal = fazendas.reduce((n, f) => n + f.areaTotalHa, 0);
  const colhido = totalColhido._sum.toneladas ?? 0;

  if (fazendas.length === 0) {
    return (
      <>
        <PageHeader
          rotulo="resumo da safra"
          titulo="Caderno de campo"
          descricao="Acompanhe fazendas, talhões e colheitas de cana-de-açúcar em um só lugar."
        />
        <EmptyState
          icone={Sprout}
          titulo="Comece pelo cadastro"
          descricao="Cadastre sua primeira fazenda para começar a organizar talhões e colheitas."
          ctaTexto="Cadastrar fazenda"
          ctaHref="/fazendas/nova"
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        rotulo="resumo da safra"
        titulo="Caderno de campo"
        descricao="Visão geral de fazendas, talhões e colheitas registradas."
      />

      <GradeMetricas>
        <CelulaMetrica
          rotulo="Fazendas"
          valor={fmtCount(fazendas.length)}
          legenda="unidades cadastradas"
        />
        <CelulaMetrica
          rotulo="Talhões"
          valor={fmtCount(numTalhoes)}
          legenda="áreas plantadas"
        />
        <CelulaMetrica
          rotulo="Área total"
          valor={fmtArea(areaTotal)}
          legenda="cadastrada"
        />
        <CelulaMetrica
          rotulo="Colhido total"
          valor={fmtTons(colhido)}
          legenda="toneladas acumuladas"
          destaque
        />
      </GradeMetricas>

      <div className="mt-10 grid gap-10 md:grid-cols-2">
        <section className="grid gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-ink">Últimas colheitas</h2>
            <Link
              href="/colheitas"
              className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-strong"
            >
              Ver todas <ArrowRight className="size-4" />
            </Link>
          </div>

          {colheitasRecentes.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line-strong bg-surface/60 px-4 py-6 text-sm text-ink-2">
              Nenhuma colheita registrada ainda.{" "}
              <Link href="/colheitas/nova" className="font-semibold text-accent underline underline-offset-2">
                Registrar a primeira
              </Link>
              .
            </p>
          ) : (
            <ul className="divide-y divide-line rounded-[10px] border border-line bg-surface px-3">
              {colheitasRecentes.map((c) => (
                <LinhaLink
                  key={c.id}
                  href={`/talhoes/${c.talhaoId}`}
                  principal={
                    <>
                      {c.talhao.nome} · {c.talhao.fazenda.nome}
                    </>
                  }
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

        <section className="grid gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-ink">Fazendas</h2>
            <Link
              href="/fazendas"
              className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-strong"
            >
              Ver todas <ArrowRight className="size-4" />
            </Link>
          </div>

          <ul className="divide-y divide-line rounded-[10px] border border-line bg-surface px-3">
            {fazendas.map((f) => (
              <LinhaLink
                key={f.id}
                href={`/fazendas/${f.id}`}
                principal={f.nome}
                secundario={
                  <>
                    <span>{[f.cidade, f.uf].filter(Boolean).join(" · ")}</span>
                    <span aria-hidden>·</span>
                    <span>
                      {f.talhoes.length} {f.talhoes.length === 1 ? "talhão" : "talhões"}
                    </span>
                  </>
                }
                destaque={fmtArea(f.areaTotalHa)}
              />
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}