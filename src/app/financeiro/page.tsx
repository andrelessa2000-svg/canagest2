import { Check, Wallet } from "lucide-react";
import { prisma } from "@/lib/db";
import {
  fmtDate,
  fmtMoney,
  TAREFAS_POR_HA,
} from "@/lib/format";
import { calcularColheita, type ItemDespesa } from "@/lib/colheita";
import { cargarCascata } from "@/lib/relatorio";
import {
  concretizarColheita,
  concretizarPlantio,
  concretizarTrato,
  excluirInvestimento,
} from "@/lib/actions";
import { ESCOPOS_TRATO_LABEL, TIPOS_TRATO_LABEL } from "@/lib/validators";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDelete } from "@/components/confirm-delete";
import { CelulaMetrica } from "@/components/stat-cells";
import { InvestimentoForm } from "@/components/investimento-form";

export const dynamic = "force-dynamic";

function safraDe(ano: number): string {
  return `${ano}/${String(ano + 1).slice(-2)}`;
}

export default async function FinanceiroPage() {
  const ano = new Date().getFullYear();
  const safraAtual = safraDe(ano);
  const safraProxima = safraDe(ano + 1);

  const [cascata, fazendas, safrasRaw, projeccTratos, projeccPlantios, investimentos, colheitasProj] =
    await Promise.all([
      cargarCascata(),
      prisma.fazenda.findMany({
        select: { id: true, nome: true, ativa: true },
        orderBy: { nome: "asc" },
      }),
      prisma.colheita.findMany({
        where: { safra: { not: null } },
        select: { safra: true },
        distinct: ["safra"],
        orderBy: { safra: "asc" },
      }),
      prisma.trato.findMany({
        where: { projecao: true },
        include: { fazenda: { select: { nome: true, ativa: true } } },
        orderBy: [{ data: "desc" }, { criadaEm: "desc" }],
      }),
      prisma.plantio.findMany({
        where: { projecao: true },
        include: { fazenda: { select: { nome: true, ativa: true } } },
        orderBy: [{ data: "desc" }, { criadaEm: "desc" }],
      }),
      prisma.investimento.findMany({
        include: { fazenda: { select: { nome: true, ativa: true } } },
        orderBy: [{ data: "desc" }, { criadaEm: "desc" }],
      }),
      prisma.colheita.findMany({
        where: { projecao: true },
        include: {
          fazenda: {
            select: { id: true, nome: true, ativa: true, talhoes: { select: { areaHa: true } } },
          },
          usina: { select: { modelo: true } },
        },
      }),
    ]);

  const safras = safrasRaw.map((s) => s.safra).filter((s) => typeof s === "string");
  const t = cascata.total;

  // Caixa = lucro bruto real (receita real − gastos reales)
  const caixa = t.lucroNeto;

  const esProxima = (s: string | null) => s === safraProxima;

  const gastosProjPorFazenda = new Map<string, number>();
  const sumar = (rows: { fazendaId: string; valor: number }[]) => {
    for (const r of rows) gastosProjPorFazenda.set(r.fazendaId, (gastosProjPorFazenda.get(r.fazendaId) ?? 0) + r.valor);
  };
  sumar(
    projeccTratos
      .filter((x) => x.fazenda.ativa && esProxima(x.safra))
      .map((x) => ({ fazendaId: x.fazendaId, valor: x.valor })),
  );
  sumar(
    projeccPlantios
      .filter((x) => x.fazenda.ativa && esProxima(x.safra))
      .map((x) => ({ fazendaId: x.fazendaId, valor: x.valor })),
  );
  sumar(
    investimentos
      .filter((i) => i.fazenda.ativa && esProxima(i.safra))
      .map((i) => ({ fazendaId: i.fazendaId, valor: i.valor })),
  );

  const gastosProximaSafra = [...gastosProjPorFazenda.values()].reduce((a, v) => a + v, 0);

  const receitaColheitaProj = (c: (typeof colheitasProj)[number]): number => {
    const areaTarefas =
      c.areaColhida ??
      c.fazenda.talhoes.reduce((a, tt) => a + tt.areaHa, 0) * TAREFAS_POR_HA;
    return calcularColheita({
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
      herbicidas: (c.herbicidas ?? []) as ItemDespesa[],
      insumos: (c.insumos ?? []) as ItemDespesa[],
      despesasUsina: (c.despesasUsina ?? []) as ItemDespesa[],
    }).receita;
  };

  const receitaProjPorFazenda = new Map<string, number>();
  for (const c of colheitasProj) {
    if (!c.fazenda.ativa || !esProxima(c.safra)) continue;
    receitaProjPorFazenda.set(
      c.fazendaId,
      (receitaProjPorFazenda.get(c.fazendaId) ?? 0) + receitaColheitaProj(c),
    );
  }
  const receitaProximaSafra = [...receitaProjPorFazenda.values()].reduce((a, v) => a + v, 0);

  const caixaProyectado = caixa - gastosProximaSafra + receitaProximaSafra;

  const projecciones: {
    id: string;
    nome: string;
    fazenda: string;
    fazendaId: string;
    ativa: boolean;
    safra: string | null;
    data: Date;
    valor: number;
    tipo: "investimento" | "trato" | "plantio";
  }[] = [
    ...investimentos.map((i) => ({
      id: i.id,
      nome: i.nome,
      fazenda: i.fazenda.nome,
      fazendaId: i.fazendaId,
      ativa: i.fazenda.ativa,
      safra: i.safra,
      data: i.data,
      valor: i.valor,
      tipo: "investimento" as const,
    })),
    ...projeccTratos.map((x) => ({
      id: x.id,
      nome: `${TIPOS_TRATO_LABEL[x.tipo] ?? x.tipo} (${ESCOPOS_TRATO_LABEL[x.escopo] ?? x.escopo})`,
      fazenda: x.fazenda.nome,
      fazendaId: x.fazendaId,
      ativa: x.fazenda.ativa,
      safra: x.safra,
      data: x.data,
      valor: x.valor,
      tipo: "trato" as const,
    })),
    ...projeccPlantios.map((x) => ({
      id: x.id,
      nome: "Plantio",
      fazenda: x.fazenda.nome,
      fazendaId: x.fazendaId,
      ativa: x.fazenda.ativa,
      safra: x.safra,
      data: x.data,
      valor: x.valor,
      tipo: "plantio" as const,
    })),
  ].sort((a, b) => b.data.getTime() - a.data.getTime());

  const totalProjecc = projecciones.reduce((a, p) => a + p.valor, 0);

  if (t.receita === 0 && totalProjecc === 0) {
    return (
      <>
        <PageHeader
          rotulo="financeiro"
          titulo="Financeiro"
          descricao={`Caixa e proyecciones — safra atual ${safraAtual}, próxima ${safraProxima}.`}
        />
        <EmptyState
          icone={Wallet}
          titulo="Nada para mostrar ainda"
          descricao="Registre colheitas e proyecciones futuras para ver o resultado financeiro do canavial."
          ctaTexto="Registrar colheita"
          ctaHref="/colheitas/nova"
        />
      </>
    );
  }

  const filasCaixa = fazendas
    .filter((f) => f.ativa)
    .map((f) => {
      const real = cascata.filas.find((x) => x.fazendaId === f.id);
      const gastosProj = gastosProjPorFazenda.get(f.id) ?? 0;
      const receitaProj = receitaProjPorFazenda.get(f.id) ?? 0;
      return {
        nome: f.nome,
        caixa: real?.lucroNeto ?? 0,
        gastosProj,
        receitaProj,
        caixaProyectado: (real?.lucroNeto ?? 0) - gastosProj + receitaProj,
      };
    })
    .sort((a, b) => b.caixa - a.caixa);

  return (
    <>
      <PageHeader
        rotulo="financeiro"
        titulo="Financeiro"
        descricao={`Caixa e proyecciones por safra. Safra atual: ${safraAtual} · próxima: ${safraProxima}. O caixa descuenta só as proyecciones da próxima safra.`}
      />

      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[10px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        <CelulaMetrica
          rotulo="Caixa atual"
          valor={fmtMoney(caixa)}
          legenda="lucro bruto real"
          destaque
        />
        <CelulaMetrica
          rotulo={`Gastos previstos ${safraProxima}`}
          valor={fmtMoney(gastosProximaSafra)}
          legenda="plantio + tratos + investimentos"
        />
        <CelulaMetrica
          rotulo={`Receita prevista ${safraProxima}`}
          valor={fmtMoney(receitaProximaSafra)}
          legenda="colheita proyectada"
        />
        <CelulaMetrica
          rotulo="Caixa proyectado"
          valor={fmtMoney(caixaProyectado)}
          legenda={`${safraProxima} · após proyecciones`}
          destaque
        />
      </div>

      <section className="mt-8 grid gap-3">
        <h2 className="font-display text-xl text-ink">Caixa por fazenda</h2>
        <div className="overflow-x-auto rounded-[10px] border border-line bg-surface">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-3">
                <th className="px-3 py-2 font-semibold">Fazenda</th>
                <th className="px-3 py-2 text-right font-semibold">Caixa atual</th>
                <th className="px-3 py-2 text-right font-semibold">Gastos previstos</th>
                <th className="px-3 py-2 text-right font-semibold">Receita prevista</th>
                <th className="px-3 py-2 text-right font-semibold">Caixa proyectado</th>
              </tr>
            </thead>
            <tbody>
              {filasCaixa.map((f) => (
                <tr key={f.nome} className="border-b border-line">
                  <td className="px-3 py-2 font-medium text-ink">{f.nome}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink">{fmtMoney(f.caixa)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink-2">{fmtMoney(f.gastosProj)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink-2">{fmtMoney(f.receitaProj)}</td>
                  <td
                    className={`px-3 py-2 text-right font-bold tabular-nums ${
                      f.caixaProyectado < 0 ? "text-danger-strong" : "text-accent"
                    }`}
                  >
                    {fmtMoney(f.caixaProyectado)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-1 text-xs text-ink-3">
          Fazendas inativas (vendidas/entregadas) ficam fora do caixa; suas proyecciones não descontam.
        </p>
      </section>

      <section className="mt-8 grid gap-4">
        <h2 className="font-display text-xl text-ink">Proyecciones e investimentos futuros</h2>
        <p className="text-sm text-ink-2">
          Descuenta do caixa só o que pertence à próxima safra ({safraProxima}). Quando um trato/plantio
          aconteça, clique Concretizar; se não aconteça, exclua o registro.
        </p>
        <div className="rounded-[10px] border border-line bg-surface p-5">
          <InvestimentoForm fazendas={fazendas} safras={safras} />
        </div>

        {projecciones.length > 0 && (
          <ul className="divide-y divide-line rounded-[10px] border border-line bg-surface px-3">
            {projecciones.map((i) => (
              <li key={`${i.tipo}-${i.id}`} className="-mx-2 flex items-center gap-2 px-2 py-3">
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="truncate text-sm font-medium text-ink">{i.nome}</span>
                  <span className="flex flex-wrap items-center gap-x-2 text-xs text-ink-3">
                    <span>{i.fazenda}</span>
                    <span aria-hidden>·</span>
                    <span>{fmtDate(i.data)}</span>
                    {i.safra && (
                      <>
                        <span aria-hidden>·</span>
                        <span>Safra {i.safra}</span>
                      </>
                    )}
                    <span className="rounded-md border border-dashed border-line-strong bg-accent-soft px-1.5 py-0.5 font-semibold text-accent-strong">
                      Projeção
                    </span>
                    {i.ativa && esProxima(i.safra) ? (
                      <span className="rounded-md bg-surface-muted px-1.5 py-0.5 font-semibold text-ink-2">
                        Descuenta do caixa
                      </span>
                    ) : !i.ativa ? (
                      <span className="rounded-md bg-surface-muted px-1.5 py-0.5 font-semibold text-ink-2">
                        Fazenda inactiva
                      </span>
                    ) : null}
                  </span>
                </span>
                <span className="tnum text-sm font-semibold text-ink">{fmtMoney(i.valor)}</span>
                {i.tipo === "investimento" ? (
                  <ConfirmDelete
                    action={excluirInvestimento.bind(null, i.id)}
                    titulo="Excluir investimento?"
                    mensagem={`"${i.nome}" (${fmtMoney(i.valor)}) será removido.`}
                    verbo="Excluir"
                    modo="stay"
                  />
                ) : (
                  <form
                    action={
                      i.tipo === "trato"
                        ? concretizarTrato.bind(null, i.id)
                        : i.tipo === "plantio"
                          ? concretizarPlantio.bind(null, i.id)
                          : concretizarColheita.bind(null, i.id)
                    }
                  >
                    <button
                      type="submit"
                      className="inline-flex size-9 items-center justify-center rounded-lg border border-transparent text-accent transition-colors hover:border-accent hover:bg-accent-soft"
                      aria-label="Concretizar"
                      title="Marcar como realizado"
                    >
                      <Check className="size-4" />
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}