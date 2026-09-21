import Link from "next/link";
import { ArrowRight, Sprout } from "lucide-react";
import { prisma } from "@/lib/db";
import {
  fmtCount,
  fmtDateShort,
  fmtHa,
  fmtMoney,
  fmtProd,
  fmtTarefas,
  fmtToneladas,
  fmtTons,
} from "@/lib/format";
import { tipoLabel } from "@/lib/validators";
import { calcularColheita } from "@/lib/colheita";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { CelulaMetrica, GradeMetricas, LinhaLink } from "@/components/stat-cells";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [fazendas, colheitasRecentes, totalColhido, colheitasFin] =
    await Promise.all([
      prisma.fazenda.findMany({
        include: { talhoes: true },
        orderBy: { nome: "asc" },
      }),
      prisma.colheita.findMany({
        include: {
          fazenda: {
            select: { id: true, nome: true, talhoes: { select: { areaHa: true } } },
          },
          usina: { select: { nome: true } },
        },
        orderBy: { data: "desc" },
        take: 5,
      }),
      prisma.colheita.aggregate({ _sum: { toneladas: true } }),
      prisma.colheita.findMany({
        select: {
          toneladas: true,
          tipo: true,
          precoCana: true,
          agio: true,
          atrPorTonelada: true,
          precoKgAtr: true,
          ctc: true,
          areaColhida: true,
          arrendar: true,
          tonsPorTarefa: true,
          tarefasArrendadas: true,
          adubo: true,
          precoTonAdubo: true,
          tarefasAdubo: true,
          herbicidas: true,
          insumos: true,
          despesasUsina: true,
          usina: { select: { modelo: true } },
        },
      }),
    ]);

  const numTalhoes = fazendas.reduce((n, f) => n + f.talhoes.length, 0);
  const areaTotal = fazendas.reduce(
    (n, f) => n + f.talhoes.reduce((a, t) => a + t.areaHa, 0),
    0,
  );
  const colhido = totalColhido._sum.toneladas ?? 0;

  const fin = colheitasFin.reduce(
    (acc, c) => {
      const r = calcularColheita({
        modelo: c.usina.modelo,
        tipo: c.tipo,
        toneladas: c.toneladas,
        precoCana: c.precoCana,
        agio: c.agio,
        atrPorTonelada: c.atrPorTonelada,
        precoKgAtr: c.precoKgAtr,
        ctc: c.ctc,
        areaColhida: c.areaColhida,
        arrendar: c.arrendar,
        tonsPorTarefa: c.tonsPorTarefa,
        tarefasArrendadas: c.tarefasArrendadas,
        adubo: c.adubo,
        precoTonAdubo: c.precoTonAdubo,
        tarefasAdubo: c.tarefasAdubo ?? undefined,
        herbicidas: (c.herbicidas ?? []) as { nome: string; valor: number }[],
        insumos: (c.insumos ?? []) as { nome: string; valor: number }[],
        despesasUsina: (c.despesasUsina ?? []) as { nome: string; valor: number }[],
      });
      return {
        toneladas: acc.toneladas + r.toneladas,
        receita: acc.receita + r.receita,
        despesas: acc.despesas + r.totalDespesas,
        lucro: acc.lucro + r.lucro,
      };
    },
    { toneladas: 0, receita: 0, despesas: 0, lucro: 0 },
  );

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
          valor={fmtHa(areaTotal)}
          legenda={`${fmtTarefas(areaTotal)} somadas`}
        />
        <CelulaMetrica
          rotulo="Colhido total"
          valor={fmtTons(colhido)}
          legenda="toneladas acumuladas"
          destaque
        />
      </GradeMetricas>

      <div className="mt-4 grid grid-cols-1 gap-px overflow-hidden rounded-[10px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        <CelulaMetrica rotulo="Receita bruta" valor={fmtMoney(fin.receita)} />
        <CelulaMetrica rotulo="Despesas" valor={fmtMoney(fin.despesas)} />
        <CelulaMetrica rotulo="Lucro líquido" valor={fmtMoney(fin.lucro)} destaque />
        <CelulaMetrica
          rotulo="Lucro por tonelada"
          valor={fmtMoney(fin.toneladas > 0 ? fin.lucro / fin.toneladas : 0)}
        />
      </div>

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
              {colheitasRecentes.map((c) => {
                const areaFazenda = c.fazenda.talhoes.reduce((a, t) => a + t.areaHa, 0);
                return (
                  <LinhaLink
                    key={c.id}
                    href={`/colheitas/${c.id}`}
                    principal={c.fazenda.nome}
                    secundario={
                      <>
                        <span>{fmtDateShort(c.data)}</span>
                        <span aria-hidden>·</span>
                        <span>{tipoLabel(c.tipo)}</span>
                        <span aria-hidden>·</span>
                        <span>{c.usina.nome}</span>
                      </>
                    }
                    destaque={fmtToneladas(c.toneladas)}
                    nota={
                      areaFazenda > 0 ? fmtProd(c.toneladas / areaFazenda) : undefined
                    }
                  />
                );
              })}
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
                        {f.talhoes.length} {f.talhoes.length === 1 ? "talhão" : "talhões"}
                      </span>
                      <span aria-hidden>·</span>
                      <span>{fmtTarefas(area)}</span>
                    </>
                  }
                  destaque={fmtHa(area)}
                />
              );
            })}
          </ul>
        </section>
      </div>
    </>
  );
}