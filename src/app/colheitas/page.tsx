import Link from "next/link";
import { Check, Pencil, Plus, Sprout } from "lucide-react";
import { prisma } from "@/lib/db";
import { fmtDate, fmtMoney, fmtToneladas, fmtCount } from "@/lib/format";
import { tipoLabel, TIPOS_COLHEITA } from "@/lib/validators";
import { calcularColheita } from "@/lib/colheita";
import { concretizarColheita, excluirColheita } from "@/lib/actions";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDelete } from "@/components/confirm-delete";
import { CelulaMetrica } from "@/components/stat-cells";

export const dynamic = "force-dynamic";

type Filtros = {
  fazenda?: string;
  usina?: string;
  tipo?: string;
  de?: string;
  ate?: string;
  reg?: string;
};

export default async function ColheitasPage({
  searchParams,
}: {
  searchParams: Promise<Filtros>;
}) {
  const { fazenda, usina, tipo, de, ate, reg } = await searchParams;

  const where = {
    ...(reg === "proj" ? { projecao: true } : reg === "real" ? { projecao: false } : {}),
    ...(fazenda ? { fazendaId: fazenda } : {}),
    ...(usina ? { usinaId: usina } : {}),
    ...(tipo ? { tipo } : {}),
    ...(de || ate
      ? {
          data: {
            ...(de ? { gte: new Date(`${de}T00:00:00`) } : {}),
            ...(ate ? { lte: new Date(`${ate}T23:59:59`) } : {}),
          },
        }
      : {}),
  };

  const [colheitas, fazendas, usinas] = await Promise.all([
    prisma.colheita.findMany({
      where,
      include: {
        fazenda: { select: { id: true, nome: true } },
        usina: { select: { nome: true, modelo: true } },
      },
      orderBy: [{ data: "desc" }, { criadaEm: "desc" }],
    }),
    prisma.fazenda.findMany({
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
    prisma.usina.findMany({
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  const linhas = colheitas.map((c) => ({
    c,
    r: calcularColheita({
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
    }),
  }));

  const totais = linhas.reduce(
    (acc, { r }) => ({
      toneladas: acc.toneladas + r.toneladas,
      receita: acc.receita + r.receita,
      despesas: acc.despesas + r.totalDespesas,
      lucro: acc.lucro + r.lucro,
    }),
    { toneladas: 0, receita: 0, despesas: 0, lucro: 0 },
  );

  const temFiltro = Boolean(reg || fazenda || usina || tipo || de || ate);

  const regs = [
    { id: "", rotulo: "Caderno de campo" },
    { id: "proj", rotulo: "Projeções" },
  ];

  return (
    <>
      <PageHeader
        rotulo="safra"
        titulo="Colheitas"
        descricao="Produção, remuneração e resultado de cada colheita registrada por fazenda."
        acao={
          <Link href="/colheitas/nova" className="btn btn-primary">
            <Plus className="size-4" /> Nova colheita
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1">
        {regs.map((r) => (
          <Link
            key={r.id}
            href={`/colheitas${r.id ? `?reg=${r.id}` : ""}`}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              (reg ?? "") === r.id ? "bg-accent text-surface" : "bg-surface-muted text-ink-2"
            }`}
          >
            {r.rotulo}
          </Link>
        ))}
      </div>

      <form
        action="/colheitas"
        method="get"
        className="ledger-panel mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <label className="grid gap-1">
          <span className="field-label">Fazenda</span>
          <select name="fazenda" defaultValue={fazenda ?? ""} className="field-input">
            <option value="">Todas</option>
            {fazendas.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="field-label">Usina</span>
          <select name="usina" defaultValue={usina ?? ""} className="field-input">
            <option value="">Todas</option>
            {usinas.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="field-label">Tipo de corte</span>
          <select name="tipo" defaultValue={tipo ?? ""} className="field-input">
            <option value="">Todos</option>
            {Object.entries(TIPOS_COLHEITA).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="field-label">De</span>
          <input type="date" name="de" defaultValue={de ?? ""} className="field-input" />
        </label>
        <label className="grid gap-1">
          <span className="field-label">Até</span>
          <input type="date" name="ate" defaultValue={ate ?? ""} className="field-input" />
        </label>
        <div className="flex items-end gap-2 lg:col-span-2">
          <button type="submit" className="btn btn-secondary">
            Filtrar
          </button>
          {temFiltro && (
            <Link href="/colheitas" className="btn btn-ghost">
              Limpar
            </Link>
          )}
        </div>
      </form>

      <div className="mb-5 grid grid-cols-1 gap-px overflow-hidden rounded-[10px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        <CelulaMetrica rotulo="Toneladas" valor={fmtToneladas(totais.toneladas)} />
        <CelulaMetrica rotulo="Receita" valor={fmtMoney(totais.receita)} />
        <CelulaMetrica rotulo="Despesas" valor={fmtMoney(totais.despesas)} />
        <CelulaMetrica rotulo="Lucro bruto" valor={fmtMoney(totais.lucro)} destaque />
      </div>

      {linhas.length === 0 ? (
        <EmptyState
          icone={Sprout}
          titulo={temFiltro ? "Nenhuma colheita no filtro" : "Nenhuma colheita ainda"}
          descricao={
            temFiltro
              ? "Ajuste os filtros para encontrar os registros de colheita."
              : "Registre a primeira colheita de uma fazenda para começar o histórico da safra."
          }
          ctaTexto={temFiltro ? undefined : "Registrar colheita"}
          ctaHref={temFiltro ? undefined : "/colheitas/nova"}
        />
      ) : (
        <div className="grid gap-3">
          <ul className="divide-y divide-line rounded-[10px] border border-line bg-surface px-3">
            {linhas.map(({ c, r }) => (
              <li key={c.id} className="-mx-2 flex items-center gap-2 px-2 py-3">
                <Link href={`/colheitas/${c.id}`} className="grid min-w-0 flex-1 gap-0.5">
                  <span className="truncate text-sm font-medium text-ink">
                    {c.fazenda.nome}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-2 text-xs text-ink-3">
                    <span>{fmtDate(c.data)}</span>
                    <span aria-hidden>·</span>
                    <span className="rounded-md bg-surface-muted px-1.5 py-0.5 font-semibold text-ink-2">
                      {tipoLabel(c.tipo)}
                    </span>
                    <span aria-hidden>·</span>
                    <span>{c.usina.nome}</span>
                    {c.projecao && (
                      <>
                        <span className="rounded-md border border-dashed border-line-strong bg-accent-soft px-1.5 py-0.5 font-semibold text-accent-strong">
                          Projeção
                        </span>
                        {c.data < new Date() && (
                          <span className="rounded-md border border-dashed border-danger-strong/40 bg-danger-soft px-1.5 py-0.5 font-semibold text-danger-strong">
                            Vencida
                          </span>
                        )}
                      </>
                    )}
                  </span>
                </Link>
                <span className="hidden text-right sm:grid">
                  <span className="tnum text-sm font-semibold text-ink">
                    {fmtToneladas(c.toneladas)}
                  </span>
                  <span
                    className={`tnum text-xs font-semibold ${
                      r.lucro < 0 ? "text-danger-strong" : "text-accent"
                    }`}
                  >
                    {fmtMoney(r.lucro)}
                  </span>
                </span>
                {c.projecao && (
                  <form action={concretizarColheita.bind(null, c.id)}>
                    <button
                      type="submit"
                      className="inline-flex size-9 items-center justify-center rounded-lg border border-transparent text-accent transition-colors hover:border-accent hover:bg-accent-soft"
                      aria-label="Concretizar colheita"
                      title="Marcar como realizado"
                    >
                      <Check className="size-4" />
                    </button>
                  </form>
                )}
                <Link
                  href={`/colheitas/${c.id}/editar`}
                  className="inline-flex size-9 items-center justify-center rounded-lg border border-transparent text-ink-3 transition-colors hover:border-line-strong hover:bg-surface-muted hover:text-ink"
                  aria-label="Editar colheita"
                >
                  <Pencil className="size-4" />
                </Link>
                <ConfirmDelete
                  action={excluirColheita.bind(null, c.id)}
                  titulo="Excluir colheita?"
                  mensagem={`O registro de ${fmtToneladas(c.toneladas)} de ${fmtDate(c.data)} será apagado.`}
                  verbo="Excluir"
                  modo="stay"
                />
              </li>
            ))}
          </ul>
          <p className="px-1 text-xs text-ink-3">
            {fmtCount(linhas.length)} {linhas.length === 1 ? "registro" : "registros"}
            {temFiltro ? " no filtro" : ""} · {fmtToneladas(totais.toneladas)} no total
          </p>
        </div>
      )}
    </>
  );
}