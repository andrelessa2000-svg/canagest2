import { Check, Wallet } from "lucide-react";
import { prisma } from "@/lib/db";
import { fmtDate, fmtMoney } from "@/lib/format";
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
import { userIdAtual } from "@/lib/auth";
import { safrasDoUsuario } from "@/lib/safras-usuario";
import { anoDeSafraIgual, safraDeAno } from "@/lib/safra";

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

export default async function FinanceiroPage() {
  const ano = new Date().getFullYear();
  const safraAtual = safraDeAno(ano);
  const safraProxima = safraDeAno(ano + 1);
  const userId = await userIdAtual();

  const [cascata, fazendas, safras, projeccTratos, projeccPlantios, investimentos, colheitasProj] =
    await Promise.all([
      cargarCascata(),
      prisma.fazenda.findMany({
        where: { userId },
        select: { id: true, nome: true, ativa: true },
        orderBy: { nome: "asc" },
      }),
      safrasDoUsuario(),
      prisma.trato.findMany({
        where: { userId, projecao: true },
        include: { fazenda: { select: { nome: true, ativa: true } } },
        orderBy: [{ data: "desc" }, { criadaEm: "desc" }],
      }),
      prisma.plantio.findMany({
        where: { userId, projecao: true },
        include: { fazenda: { select: { nome: true, ativa: true } } },
        orderBy: [{ data: "desc" }, { criadaEm: "desc" }],
      }),
      prisma.investimento.findMany({
        where: { userId },
        include: { fazenda: { select: { nome: true, ativa: true } } },
        orderBy: [{ data: "desc" }, { criadaEm: "desc" }],
      }),
      prisma.colheita.findMany({
        where: { userId, projecao: true },
        include: {
          fazenda: {
            select: { id: true, nome: true, ativa: true },
          },
          usina: { select: { modelo: true } },
          custo: true,
        },
      }),
    ]);

  const t = cascata.total;

  // Caixa = lucro bruto real (receita real − gastos reais)
  const caixa = t.lucroNeto;

  const esProxima = (s: string | null) => anoDeSafraIgual(s, ano + 1);

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
    const custo = c.custo;
    return calcularColheita({
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

  const caixaProjetado = caixa - gastosProximaSafra + receitaProximaSafra;

  const projeções: {
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

  const totalProjecc = projeções.reduce((a, p) => a + p.valor, 0);

  if (t.receita === 0 && totalProjecc === 0) {
    return (
      <>
        <PageHeader
          rotulo="financeiro"
          titulo="Financeiro"
          descricao={`Caixa e projeções — safra atual ${safraAtual}, próxima ${safraProxima}.`}
        />
        <EmptyState
          icone={Wallet}
          titulo="Nada para mostrar ainda"
          descricao="Registre colheitas e projeções futuras para ver o resultado financeiro do canavial."
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
        caixaProjetado: (real?.lucroNeto ?? 0) - gastosProj + receitaProj,
      };
    })
    .sort((a, b) => b.caixa - a.caixa);

  return (
    <>
      <PageHeader
        rotulo="financeiro"
        titulo="Financeiro"
        descricao={`Caixa e projeções por safra. Safra atual: ${safraAtual} · próxima: ${safraProxima}. O caixa desconta só as projeções da próxima safra.`}
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
          legenda="colheita projetada"
        />
        <CelulaMetrica
          rotulo="Caixa projetado"
          valor={fmtMoney(caixaProjetado)}
          legenda={`${safraProxima} · após projeções`}
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
                <th className="px-3 py-2 text-right font-semibold">Caixa projetado</th>
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
                      f.caixaProjetado < 0 ? "text-danger-strong" : "text-accent"
                    }`}
                  >
                    {fmtMoney(f.caixaProjetado)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-1 text-xs text-ink-3">
          Fazendas inativas (vendidas/entregues) ficam fora do caixa; suas projeções não descontam.
        </p>
      </section>

      <section className="mt-8 grid gap-4">
        <h2 className="font-display text-xl text-ink">Projeções e investimentos futuros</h2>
        <p className="text-sm text-ink-2">
          Desconta do caixa só o que pertence à próxima safra ({safraProxima}). Quando um trato/plantio
          aconteça, clique Concretizar; se não aconteça, exclua o registro.
        </p>
        <div className="rounded-[10px] border border-line bg-surface p-5">
          <InvestimentoForm fazendas={fazendas} safras={safras} />
        </div>

        {projeções.length > 0 && (
          <ul className="divide-y divide-line rounded-[10px] border border-line bg-surface px-3">
            {projeções.map((i) => (
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
                        Desconta do caixa
                      </span>
                    ) : !i.ativa ? (
                      <span className="rounded-md bg-surface-muted px-1.5 py-0.5 font-semibold text-ink-2">
                        Fazenda inativa
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