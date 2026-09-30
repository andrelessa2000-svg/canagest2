import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/db";
import { userIdAtual } from "@/lib/auth";
import { fmtAtrT, fmtCount, fmtMoney, fmtMoneyPorKgAtr } from "@/lib/format";
import {
  compararCenarios,
  mediaMovel,
  ordenar,
  rotulo,
  serieMensal,
  variacao,
  type PrecoMes,
} from "@/lib/historico-preco";
import { salvarPreco, excluirPreco } from "@/lib/actions";
import { PageHeader } from "@/components/page-header";
import { PrecoForm } from "@/components/preco-form";
import { ConfirmDelete } from "@/components/confirm-delete";
import { CelulaMetrica, GradeMetricas } from "@/components/stat-cells";

export const dynamic = "force-dynamic";

const MESES_VISIVEIS = 12;

export default async function HistoricoPrecoPage() {
  const userId = await userIdAtual();
  const registros = await prisma.historicoPreco.findMany({
    where: { userId },
    orderBy: [{ ano: "asc" }, { mes: "asc" }],
  });

  const serie: PrecoMes[] = registros.map((r) => ({
    ano: r.ano,
    mes: r.mes,
    precoMedio: r.precoMedio,
    fonte: r.fonte,
    atrPorTonelada: r.atrPorTonelada,
    precoKgAtr: r.precoKgAtr,
  }));

  const ordenada = ordenar(serie);
  const ultimo = ordenada.at(-1);
  const hoje = new Date();
  const ref = { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 };

  const serie12 = serieMensal(ordenada, MESES_VISIVEIS, ref);
  const comPreco = serie12.filter((m) => m.preco !== null);
  const maximo = Math.max(...serie12.map((m) => m.preco ?? 0), 0);

  const media6 = mediaMovel(ordenada, 6);
  const cenario = compararCenarios(ordenada, ref, 0);

  const varMensal =
    ultimo && ultimo.mes === ref.mes
      ? variacao(cenario.passado?.preco ?? 0, ultimo.precoMedio)
      : null;

  return (
    <>
      <PageHeader
        rotulo="configuração"
        titulo="Histórico de preço da cana"
        descricao="Aqui ficam apenas os valores oficiais mês a mês — o dado real que alimenta a análise. Cenários e projeções hipotéticos ficam no simulador e nunca são gravados nesta lista."
        acao={
          <Link href="/simulador" className="btn btn-secondary">
            <TrendingUp className="size-4" aria-hidden="true" /> Usar no simulador
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="grid gap-6">
          <section className="overflow-hidden rounded-[10px] border border-line">
            <GradeMetricas>
              <CelulaMetrica
                rotulo="Último preço"
                valor={ultimo ? `${fmtMoney(ultimo.precoMedio)}/t` : "—"}
                legenda={ultimo ? rotulo(ultimo.ano, ultimo.mes) : "sem registros"}
                destaque
              />
              <CelulaMetrica
                rotulo="Média 6 meses"
                valor={media6 > 0 ? `${fmtMoney(media6)}/t` : "—"}
                legenda="base de referência"
              />
              <CelulaMetrica
                rotulo="Variação do mês"
                valor={
                  varMensal === null
                    ? "—"
                    : `${varMensal > 0 ? "+" : ""}${varMensal.toFixed(1)}%`
                }
                legenda={ultimo ? rotulo(ultimo.ano, ultimo.mes) : "sem base"}
              />
              <CelulaMetrica
                rotulo="Meses cadastrados"
                valor={fmtCount(ordenada.length)}
                legenda="histórico disponível"
              />
            </GradeMetricas>
          </section>

          <section
            aria-labelledby="titulo-serie"
            className="rounded-[10px] border border-line bg-surface p-5 sm:p-6"
          >
            <div className="mb-5 grid gap-1">
              <h2 id="titulo-serie" className="font-display text-xl text-ink">
                Últimos {MESES_VISIVEIS} meses
              </h2>
              <p className="text-sm text-ink-2">
                Barras proporcionais ao preço médio oficial. Meses sem registro ficam vazios.
              </p>
            </div>

            {comPreco.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-2">
                Nenhum preço cadastrado ainda. Adicione o primeiro ao lado para ver a série.
              </p>
            ) : (
              <ul className="flex h-44 items-end gap-1.5 sm:gap-2">
                {serie12.map((m) => {
                  const altura = m.preco !== null && maximo > 0 ? (m.preco / maximo) * 100 : 0;
                  return (
                    <li key={`${m.ano}-${m.mes}`} className="flex h-full flex-1 flex-col justify-end gap-1.5">
                      <div className="group relative flex flex-1 items-end">
                        {m.preco !== null ? (
                          <>
                            <div
                              className="w-full rounded-t-[4px] bg-accent/85 transition-colors group-hover:bg-accent"
                              style={{ height: `${Math.max(altura, 3)}%` }}
                            />
                            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-surface px-2 py-1 text-xs font-semibold text-ink shadow-lg group-hover:block">
                              {fmtMoney(m.preco)}/t
                            </span>
                          </>
                        ) : (
                          <div className="w-full rounded-t-[4px] border border-dashed border-line-strong" style={{ height: "3px" }} />
                        )}
                      </div>
                      <span className="text-center text-[0.625rem] text-ink-3 tnum">{m.rotulo}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section
            aria-labelledby="titulo-registros"
            className="rounded-[10px] border border-line bg-surface p-5 sm:p-6"
          >
            <h2 id="titulo-registros" className="mb-4 font-display text-xl text-ink">
              Registros
            </h2>

            {ordenada.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-2">Nenhum registro ainda.</p>
            ) : (
              <ul className="divide-y divide-line">
                {[...ordenada].reverse().map((p) => {
                  const anterior = ordenar(serie).find(
                    (o) =>
                      o.mes === ((p.mes === 1 ? 12 : p.mes - 1) as number) &&
                      o.ano === (p.mes === 1 ? p.ano - 1 : p.ano),
                  );
                  const varPreco = anterior ? variacao(anterior.precoMedio, p.precoMedio) : null;
                  const Icone =
                    varPreco === null || Math.abs(varPreco) < 0.05
                      ? Minus
                      : varPreco > 0
                        ? ArrowUpRight
                        : ArrowDownRight;
                  const cor =
                    varPreco === null || Math.abs(varPreco) < 0.05
                      ? "text-ink-3"
                      : varPreco > 0
                        ? "text-success"
                        : "text-danger-strong";

                  return (
                    <li key={`${p.ano}-${p.mes}`} className="flex items-center gap-3 py-3">
                      <span className="grid min-w-0 flex-1 gap-0.5">
                        <span className="text-[0.9375rem] font-semibold text-ink">
                          {rotulo(p.ano, p.mes)}
                        </span>
                        {p.fonte && <span className="truncate text-xs text-ink-3">{p.fonte}</span>}
                        {p.atrPorTonelada != null && p.atrPorTonelada > 0 && (
                          <span className="truncate text-xs text-ink-3 tnum">
                            {fmtAtrT(p.atrPorTonelada)}
                            {p.precoKgAtr != null && p.precoKgAtr > 0
                              ? ` · ${fmtMoneyPorKgAtr(p.precoKgAtr)}`
                              : ""}
                          </span>
                        )}
                      </span>

                      <span className="flex shrink-0 items-center gap-3">
                        <span className="tnum text-[0.9375rem] font-bold text-ink">
                          {fmtMoney(p.precoMedio)}/t
                        </span>
                        {varPreco !== null && (
                          <span className={`hidden items-center gap-0.5 text-xs font-semibold sm:flex ${cor}`}>
                            <Icone className="size-3.5" aria-hidden="true" />
                            {varPreco > 0 ? "+" : ""}
                            {varPreco.toFixed(1)}%
                          </span>
                        )}
                        <ConfirmDelete
                          action={excluirPreco.bind(null, p.ano, p.mes)}
                          titulo="Remover preço?"
                          mensagem={`O preço de ${rotulo(p.ano, p.mes)} será apagado e os cenários do simulador serão recalculados.`}
                          verbo="Remover"
                          modo="stay"
                          rotuloAria="Remover preço"
                        />
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <aside className="rounded-[10px] border border-line bg-surface p-5 sm:p-6 lg:sticky lg:top-20">
          <h2 className="font-display text-lg text-ink">Adicionar preço</h2>
          <p className="mb-5 mt-1 text-sm leading-relaxed text-ink-2">
            Salve o preço do mês. Registrar o mesmo mês de novo atualiza o valor.
          </p>
          <PrecoForm acao={salvarPreco} />
        </aside>
      </div>
    </>
  );
}
