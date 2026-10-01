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
import { calcularColheita, type ItemDespesa } from "@/lib/colheita";
import { userIdAtual } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { CelulaMetrica, GradeMetricas, LinhaLink } from "@/components/stat-cells";

export const dynamic = "force-dynamic";

function lerDividas(bruto: unknown): ItemDespesa[] {
  if (!Array.isArray(bruto)) return [];
  return bruto
    .filter((d): d is Record<string, unknown> => !!d && typeof d === "object")
    .map((d) => ({
      nome: String(d.nome ?? ""),
      valor: Number(d.valor ?? d.valorTotal) || 0,
    }));
}

export default async function DashboardPage() {
  const userId = await userIdAtual();
  const [fazendas, colheitasRecentes, totalColhido, colheitasFin] =
    await Promise.all([
      prisma.fazenda.findMany({
        where: { userId },
        include: { talhoes: true },
        orderBy: { nome: "asc" },
      }),
      prisma.colheita.findMany({
        where: { userId, projecao: false },
        include: {
          fazenda: {
            select: { id: true, nome: true, talhoes: { select: { areaHa: true } } },
          },
          usina: { select: { nome: true } },
          custo: true,
        },
        orderBy: { data: "desc" },
        take: 5,
      }),
      prisma.colheita.aggregate({
        where: { userId, projecao: false },
        _sum: { toneladas: true },
      }),
      prisma.colheita.findMany({
        where: { userId, projecao: false },
        include: {
          usina: { select: { modelo: true } },
          custo: true,
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
      const custo = c.custo;
      const r = calcularColheita({
        modelo: c.usina.modelo,
        tipo: c.tipo,
        toneladas: c.toneladas,
        precoCana: c.precoCana,
        agio: c.agio,
        atrPorTonelada: c.atrPorTonelada,
        precoKgAtr: c.precoKgAtr,
        ctc: custo?.ctc,
        arrendar: custo?.arrendar ?? false,
        tonsPorTarefa: custo?.tonsPorTarefa,
        tarefasArrendadas: custo?.tarefasArrendadas,
        dividas: lerDividas(custo?.dividas),
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
        <CelulaMetrica rotulo="Lucro bruto" valor={fmtMoney(fin.lucro)} destaque />
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