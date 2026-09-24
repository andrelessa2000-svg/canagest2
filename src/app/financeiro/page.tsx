import { Wallet } from "lucide-react";
import { prisma } from "@/lib/db";
import { fmtDate, fmtMoney, fmtToneladas } from "@/lib/format";
import { cargarCascata } from "@/lib/relatorio";
import { excluirInvestimento } from "@/lib/actions";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDelete } from "@/components/confirm-delete";
import { CelulaMetrica } from "@/components/stat-cells";
import { InvestimentoForm } from "@/components/investimento-form";

export const dynamic = "force-dynamic";

export default async function FinanceiroPage() {
  const [cascata, investimentos, fazendas, safrasRaw] = await Promise.all([
    cargarCascata(),
    prisma.investimento.findMany({
      include: { fazenda: { select: { nome: true } } },
      orderBy: [{ data: "desc" }, { criadaEm: "desc" }],
    }),
    prisma.fazenda.findMany({ select: { id: true, nome: true }, orderBy: { nome: "asc" } }),
    prisma.colheita.findMany({
      where: { safra: { not: null } },
      select: { safra: true },
      distinct: ["safra"],
      orderBy: { safra: "asc" },
    }),
  ]);

  const safras = safrasRaw.map((s) => s.safra).filter((s) => typeof s === "string");
  const t = cascata.total;

  if (t.receita === 0 && investimentos.length === 0) {
    return (
      <>
        <PageHeader
          rotulo="financeiro"
          titulo="Financeiro"
          descricao="Receita, gastos e inversões futuras — o lucro líquido real e estimado do canavial."
        />
        <EmptyState
          icone={Wallet}
          titulo="Nada para mostrar ainda"
          descricao="Registre colheitas e inversões futuras para ver o resultado financeiro do canavial."
          ctaTexto="Registrar colheita"
          ctaHref="/colheitas/nova"
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        rotulo="financeiro"
        titulo="Financeiro"
        descricao="O que entra (receita das colheitas) e o que sai (gastos reais e inversões futuras)."
      />

      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[10px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
        <CelulaMetrica rotulo="Receita" valor={fmtMoney(t.receita)} legenda={fmtToneladas(t.toneladas)} />
        <CelulaMetrica
          rotulo="Gastos reais"
          valor={fmtMoney(t.receita - t.lucroNeto)}
          legenda="colheita + tratos + plantio"
        />
        <CelulaMetrica rotulo="Lucro líquido" valor={fmtMoney(t.lucroNeto)} destaque />
        <CelulaMetrica
          rotulo="Inversões futuras"
          valor={fmtMoney(t.proj)}
          legenda="até a próxima safra"
        />
        <CelulaMetrica rotulo="Lucro líquido estimado" valor={fmtMoney(t.lucroNetoEstimado)} destaque />
      </div>

      <section className="mt-8 grid gap-4">
        <h2 className="font-display text-xl text-ink">Inversões futuras</h2>
        <p className="text-sm text-ink-2">
          Custos previstos até a próxima safra (tratos, plantio, adubação…). Se descontam do lucro
          líquido para estimar o que realmente te fica.
        </p>
        <div className="rounded-[10px] border border-line bg-surface p-5">
          <InvestimentoForm fazendas={fazendas} safras={safras} />
        </div>

        {investimentos.length > 0 && (
          <ul className="divide-y divide-line rounded-[10px] border border-line bg-surface px-3">
            {investimentos.map((i) => (
              <li key={i.id} className="-mx-2 flex items-center gap-2 px-2 py-3">
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="truncate text-sm font-medium text-ink">{i.nome}</span>
                  <span className="flex flex-wrap items-center gap-x-2 text-xs text-ink-3">
                    <span>{i.fazenda.nome}</span>
                    <span aria-hidden>·</span>
                    <span>{fmtDate(i.data)}</span>
                    {i.safra && (
                      <>
                        <span aria-hidden>·</span>
                        <span>Safra {i.safra}</span>
                      </>
                    )}
                  </span>
                </span>
                <span className="tnum text-sm font-semibold text-ink">{fmtMoney(i.valor)}</span>
                <ConfirmDelete
                  action={excluirInvestimento.bind(null, i.id)}
                  titulo="Excluir inversão?"
                  mensagem={`"${i.nome}" (${fmtMoney(i.valor)}) será removida.`}
                  verbo="Excluir"
                  modo="stay"
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 grid gap-3">
        <h2 className="font-display text-xl text-ink">Por fazenda</h2>
        <div className="overflow-x-auto rounded-[10px] border border-line bg-surface">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-3">
                <th className="px-3 py-2 font-semibold">Fazenda</th>
                <th className="px-3 py-2 text-right font-semibold">Receita</th>
                <th className="px-3 py-2 text-right font-semibold">Gastos</th>
                <th className="px-3 py-2 text-right font-semibold">Lucro líquido</th>
                <th className="px-3 py-2 text-right font-semibold">Inversões futuras</th>
                <th className="px-3 py-2 text-right font-semibold">Lucro líquido estimado</th>
              </tr>
            </thead>
            <tbody>
              {cascata.filas.map((f) => (
                <tr key={f.fazendaId} className="border-b border-line">
                  <td className="px-3 py-2 font-medium text-ink">{f.fazendaNome}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink">{fmtMoney(f.receita)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink-2">
                    {fmtMoney(f.receita - f.lucroNeto)}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-ink">
                    {fmtMoney(f.lucroNeto)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink-2">{fmtMoney(f.proj)}</td>
                  <td
                    className={`px-3 py-2 text-right font-bold tabular-nums ${
                      f.lucroNetoEstimado < 0 ? "text-danger-strong" : "text-accent"
                    }`}
                  >
                    {fmtMoney(f.lucroNetoEstimado)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}