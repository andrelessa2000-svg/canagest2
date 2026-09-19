import { BarChart3 } from "lucide-react";
import { prisma } from "@/lib/db";
import {
  fmtCount,
  fmtDate,
  fmtMoney,
  fmtToneladas,
  TAREFAS_POR_HA,
} from "@/lib/format";
import { calcularColheita } from "@/lib/colheita";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { PrintButton } from "@/components/print-button";
import { CelulaMetrica } from "@/components/stat-cells";

export const dynamic = "force-dynamic";

const nf0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

function pct(valor: number, max: number): number {
  if (max <= 0) return 0;
  return valor > 0 ? Math.max(Math.round((valor / max) * 100), 3) : 0;
}

function categoriaDespesas(rotulo: string, valor: number, cor: string) {
  return { rotulo, valor, cor };
}

export default async function RelatoriosPage() {
  const [colheitas, fazendas] = await Promise.all([
    prisma.colheita.findMany({
      include: {
        fazenda: {
          select: { id: true, nome: true, talhoes: { select: { areaHa: true } } },
        },
        usina: { select: { nome: true, modelo: true } },
      },
      orderBy: { data: "asc" },
    }),
    prisma.fazenda.findMany({
      select: { id: true, nome: true, talhoes: { select: { areaHa: true } } },
      orderBy: { nome: "asc" },
    }),
  ]);

  if (colheitas.length === 0) {
    return (
      <>
        <PageHeader
          rotulo="relatório"
          titulo="Relatórios"
          descricao="Análise completa da produção, produtividade e resultado."
        />
        <EmptyState
          icone={BarChart3}
          titulo="Nada para analisar ainda"
          descricao="Registre colheitas para que os relatórios e gráficos sejam gerados."
          ctaTexto="Registrar colheita"
          ctaHref="/colheitas/nova"
        />
      </>
    );
  }

  const linhas = colheitas.map((c) => {
    const areaFazendaHa = c.fazenda.talhoes.reduce((a, t) => a + t.areaHa, 0);
    const areaTarefas = c.areaColhida ?? areaFazendaHa * TAREFAS_POR_HA;
    const r = calcularColheita({
      modelo: c.usina.modelo,
      tipo: c.tipo,
      toneladas: c.toneladas,
      precoCana: c.precoCana,
      agio: c.agio,
      atrPorTonelada: c.atrPorTonelada,
      precoKgAtr: c.precoKgAtr,
      ctc: c.ctc,
      areaColhida: areaTarefas,
      arrendar: c.arrendar,
      tonsPorTarefa: c.tonsPorTarefa,
      tarefasArrendadas: c.tarefasArrendadas,
      adubo: c.adubo,
      precoTonAdubo: c.precoTonAdubo,
      tarefasAdubo: c.tarefasAdubo ?? areaTarefas,
      herbicidas: (c.herbicidas ?? []) as { nome: string; valor: number }[],
      insumos: (c.insumos ?? []) as { nome: string; valor: number }[],
      despesasUsina: (c.despesasUsina ?? []) as { nome: string; valor: number }[],
    });
    return {
      id: c.id,
      data: c.data,
      ano: c.data.getFullYear(),
      toneladas: c.toneladas,
      areaTarefas,
      areaHa: areaTarefas / TAREFAS_POR_HA,
      fazendaId: c.fazenda.id,
      fazendaNome: c.fazenda.nome,
      usinaNome: c.usina.nome,
      r,
    };
  });

  const total = colheitas.reduce(
    (acc, c, i) => {
      const l = linhas[i];
      return {
        toneladas: acc.toneladas + l.toneladas,
        receita: acc.receita + l.r.receita,
        despesas: acc.despesas + l.r.totalDespesas,
        lucro: acc.lucro + l.r.lucro,
        areaTarefas: acc.areaTarefas + l.areaTarefas,
      };
    },
    { toneladas: 0, receita: 0, despesas: 0, lucro: 0, areaTarefas: 0 },
  );

  const tonsPorTarefa = total.areaTarefas > 0 ? total.toneladas / total.areaTarefas : 0;
  const tonsPorHa = total.areaTarefas > 0 ? total.toneladas / (total.areaTarefas / TAREFAS_POR_HA) : 0;

  // Por ano (safra)
  const porAno = new Map<number, { tons: number; receita: number; lucro: number; n: number }>();
  for (const l of linhas) {
    const a = porAno.get(l.ano) ?? { tons: 0, receita: 0, lucro: 0, n: 0 };
    a.tons += l.toneladas;
    a.receita += l.r.receita;
    a.lucro += l.r.lucro;
    a.n += 1;
    porAno.set(l.ano, a);
  }
  const anos = [...porAno.entries()]
    .map(([ano, v]) => ({ ano, ...v }))
    .sort((a, b) => b.tons - a.tons);

  // Por fazenda
  const mapaFazenda = new Map<
    string,
    {
      nome: string;
      tons: number;
      areaTarefas: number;
      receita: number;
      despesas: number;
      lucro: number;
      n: number;
    }
  >();
  for (const l of linhas) {
    const f = mapaFazenda.get(l.fazendaId) ?? {
      nome: l.fazendaNome,
      tons: 0,
      areaTarefas: 0,
      receita: 0,
      despesas: 0,
      lucro: 0,
      n: 0,
    };
    f.tons += l.toneladas;
    f.areaTarefas += l.areaTarefas;
    f.receita += l.r.receita;
    f.despesas += l.r.totalDespesas;
    f.lucro += l.r.lucro;
    f.n += 1;
    mapaFazenda.set(l.fazendaId, f);
  }
  const fazendaResumo = [...mapaFazenda.values()]
    .map((f) => ({
      ...f,
      tTarefa: f.areaTarefas > 0 ? f.tons / f.areaTarefas : 0,
      lucroT: f.tons > 0 ? f.lucro / f.tons : 0,
    }))
    .sort((a, b) => b.tons - a.tons);

  // Rankings
  const maiorTons = [...linhas].sort((a, b) => b.toneladas - a.toneladas)[0];
  const menorTons = [...linhas].sort((a, b) => a.toneladas - b.toneladas)[0];
  const maiorLucro = [...linhas].sort((a, b) => b.r.lucro - a.r.lucro)[0];
  const menorLucro = [...linhas].sort((a, b) => a.r.lucro - b.r.lucro)[0];
  const comProdutividade = fazendaResumo.filter((f) => f.areaTarefas > 0);
  const maiorProd =
    comProdutividade.length > 0
      ? comProdutividade.sort((a, b) => b.tTarefa - a.tTarefa)[0]
      : null;
  const menorProd =
    comProdutividade.length > 0
      ? comProdutividade.sort((a, b) => a.tTarefa - b.tTarefa)[0]
      : null;

  // Composição das despesas
  const categorias = [
    categoriaDespesas("CTC", linhas.reduce((a, l) => a + l.r.ctc, 0), "var(--accent)"),
    categoriaDespesas(
      "Arrendamento",
      linhas.reduce((a, l) => a + l.r.arrendamento, 0),
      "var(--accent-strong)",
    ),
    categoriaDespesas("Adubo", linhas.reduce((a, l) => a + l.r.adubo, 0), "var(--danger-strong)"),
    categoriaDespesas(
      "Herbicida",
      linhas.reduce((a, l) => a + l.r.herbicida, 0),
      "var(--danger)",
    ),
    categoriaDespesas(
      "Outros insumos",
      linhas.reduce((a, l) => a + l.r.insumos, 0),
      "var(--ink-2)",
    ),
    categoriaDespesas(
      "Despesas com a usina",
      linhas.reduce((a, l) => a + l.r.despesasUsina, 0),
      "var(--ink-3)",
    ),
  ].filter((c) => c.valor > 0);
  const maxDespesa = Math.max(...categorias.map((c) => c.valor), 1);
  const maxTonsAno = Math.max(...anos.map((a) => a.tons), 1);
  const maxTonsFazenda = Math.max(...fazendaResumo.map((f) => f.tons), 1);

  return (
    <>
      <PageHeader
        rotulo="relatório completo"
        titulo="Relatórios"
        descricao="Safra, produtividade e resultado — valores e gráficos para imprimir."
        acao={<PrintButton />}
      />

      {/* Visão geral */}
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[10px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        <CelulaMetrica rotulo="Toneladas colhidas" valor={fmtToneladas(total.toneladas)} />
        <CelulaMetrica
          rotulo="Toneladas por tarefa"
          valor={nf2.format(tonsPorTarefa)}
          legenda={`sobre ${nf0.format(total.areaTarefas)} tarefas`}
        />
        <CelulaMetrica rotulo="Produtividade média" valor={`${nf1.format(tonsPorHa)} t/ha`} />
        <CelulaMetrica
          rotulo="Lucro total"
          valor={fmtMoney(total.lucro)}
          legenda={`${fmtCount(colheitas.length)} colheitas`}
          destaque
        />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-px overflow-hidden rounded-[10px] border border-line bg-line sm:grid-cols-3">
        <CelulaMetrica rotulo="Receita" valor={fmtMoney(total.receita)} />
        <CelulaMetrica rotulo="Despesas" valor={fmtMoney(total.despesas)} />
        <CelulaMetrica
          rotulo="Custo por tonelada"
          valor={fmtMoney(total.toneladas > 0 ? total.despesas / total.toneladas : 0)}
        />
      </div>

      {/* Rankings */}
      <section className="mt-10 grid gap-3">
        <h2 className="font-display text-xl text-ink">Destaques</h2>
        <div className="grid gap-px overflow-hidden rounded-[10px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          <CelulaMetrica
            rotulo="Maior safra em toneladas"
            valor={fmtToneladas(maiorTons.toneladas)}
            legenda={`${maiorTons.fazendaNome} · ${fmtDate(maiorTons.data)}`}
            destaque
          />
          <CelulaMetrica
            rotulo="Menor safra em toneladas"
            valor={fmtToneladas(menorTons.toneladas)}
            legenda={`${menorTons.fazendaNome} · ${fmtDate(menorTons.data)}`}
          />
          <CelulaMetrica
            rotulo="Maior produtividade por área"
            valor={`${nf1.format(maiorProd?.tTarefa ?? 0)} t/tarefa`}
            legenda={
              maiorProd ? `${maiorProd.nome} · ${nf0.format(maiorProd.areaTarefas)} tarefas` : "—"
            }
            destaque
          />
          <CelulaMetrica
            rotulo="Menor produtividade por área"
            valor={`${nf1.format(menorProd?.tTarefa ?? 0)} t/tarefa`}
            legenda={menorProd ? `${menorProd.nome}` : "—"}
          />
          <CelulaMetrica
            rotulo="Maior lucro por safra"
            valor={fmtMoney(maiorLucro.r.lucro)}
            legenda={`${maiorLucro.fazendaNome} · ${fmtDate(maiorLucro.data)}`}
          />
          <CelulaMetrica
            rotulo="Menor lucro por safra"
            valor={fmtMoney(menorLucro.r.lucro)}
            legenda={`${menorLucro.fazendaNome} · ${fmtDate(menorLucro.data)}`}
          />
        </div>
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        {/* Gráfico: toneladas por safra */}
        <section className="grid gap-3">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-xl text-ink">Toneladas por safra</h2>
            <span className="text-xs text-ink-3">agrupado por ano</span>
          </div>
          <div className="ledger-panel p-5">
            <div className="flex h-44 items-end gap-2">
              {anos.map((a) => (
                <div
                  key={a.ano}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-1"
                >
                  <span className="text-[10px] tabular-nums text-ink-2">
                    {a.tons >= 1000 ? `${nf1.format(a.tons / 1000)} mil` : nf0.format(a.tons)}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-accent"
                    style={{ height: `${pct(a.tons, maxTonsAno)}%` }}
                    title={`${a.ano}: ${fmtToneladas(a.tons)}`}
                  />
                </div>
              ))}
            </div>
            <div className="mt-1 flex gap-2 border-t border-line pt-2">
              {anos.map((a) => (
                <div key={a.ano} className="flex-1 text-center text-[10px] text-ink-3">
                  {a.ano}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Gráfico: toneladas por fazenda */}
        <section className="grid gap-3">
          <h2 className="font-display text-xl text-ink">Toneladas por fazenda</h2>
          <div className="ledger-panel grid gap-3 p-5">
            {fazendaResumo.map((f) => (
              <div
                key={f.nome}
                className="grid grid-cols-[6.5rem_1fr_4.5rem] items-center gap-3"
              >
                <span className="truncate text-sm font-medium text-ink">{f.nome}</span>
                <div className="h-3.5 overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${pct(f.tons, maxTonsFazenda)}%` }}
                  />
                </div>
                <span className="text-right text-xs tabular-nums text-ink-2">
                  {fmtToneladas(f.tons)}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Composição das despesas */}
      <section className="mt-10 grid gap-3">
        <h2 className="font-display text-xl text-ink">Composição das despesas</h2>
        <div className="ledger-panel grid gap-3 p-5">
          {categorias.map((c) => (
            <div
              key={c.rotulo}
              className="grid grid-cols-[10rem_1fr_6.5rem] items-center gap-3"
            >
              <span className="truncate text-sm text-ink-2">{c.rotulo}</span>
              <div className="h-3.5 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct(c.valor, maxDespesa)}%`, background: c.cor }}
                />
              </div>
              <span className="text-right text-xs tabular-nums text-ink">
                {fmtMoney(c.valor)}
              </span>
            </div>
          ))}
          <div className="grid grid-cols-[10rem_1fr_6.5rem] items-center gap-3 border-t border-line pt-3">
            <span className="text-sm font-semibold text-ink">Total</span>
            <div />
            <span className="text-right text-sm font-semibold tabular-nums text-ink">
              {fmtMoney(total.despesas)}
            </span>
          </div>
        </div>
      </section>

      {/* Tabela por fazenda */}
      <section className="mt-10 grid gap-3">
        <h2 className="font-display text-xl text-ink">Comparativo por fazenda</h2>
        <div className="overflow-x-auto rounded-[10px] border border-line bg-surface">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-3">
                <th className="px-4 py-3 font-semibold">Fazenda</th>
                <th className="px-4 py-3 text-right font-semibold">Área colhida</th>
                <th className="px-4 py-3 text-right font-semibold">Toneladas</th>
                <th className="px-4 py-3 text-right font-semibold">t/tarefa</th>
                <th className="px-4 py-3 text-right font-semibold">Receita</th>
                <th className="px-4 py-3 text-right font-semibold">Despesas</th>
                <th className="px-4 py-3 text-right font-semibold">Lucro</th>
                <th className="px-4 py-3 text-right font-semibold">Lucro/t</th>
              </tr>
            </thead>
            <tbody>
              {fazendaResumo.map((f) => (
                <tr key={f.nome} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{f.nome}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-2">
                    {nf0.format(f.areaTarefas)} tarefas
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink">
                    {fmtToneladas(f.tons)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink">
                    {nf1.format(f.tTarefa)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink">
                    {fmtMoney(f.receita)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-2">
                    {fmtMoney(f.despesas)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-semibold tabular-nums ${
                      f.lucro < 0 ? "text-danger-strong" : "text-accent"
                    }`}
                  >
                    {fmtMoney(f.lucro)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-2">
                    {fmtMoney(f.lucroT)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-1 text-xs text-ink-3">
          Área colhida somada dos registros; quando a fazenda não informou área colhida,
          usada a soma dos talhões. {fazendas.length} fazendas no cadastro.
        </p>
      </section>
    </>
  );
}