import Link from "next/link";
import { ChevronLeft, Filter } from "lucide-react";
import { prisma } from "@/lib/db";
import { fmtCount, fmtMoney } from "@/lib/format";
import { TIPOS_TRATO_LABEL } from "@/lib/validators";
import { PageHeader } from "@/components/page-header";
import { CelulaMetrica } from "@/components/stat-cells";

export const dynamic = "force-dynamic";

type Filtros = {
  safra?: string;
  fazenda?: string;
  tipo?: string;
  reg?: string;
};

type Prod = { nome?: string; unidade?: string; quantidade?: number | string };

export default async function InsumosReportPage({
  searchParams,
}: {
  searchParams: Promise<Filtros>;
}) {
  const { safra, fazenda, tipo, reg } = await searchParams;

  const whereBase = {
    ...(safra ? { safra } : {}),
    ...(fazenda ? { fazendaId: fazenda } : {}),
    ...(reg === "proj" ? { projecao: true } : reg === "real" ? { projecao: false } : {}),
  };

  const [plantios, tratos, fazendasRaw, safrasRaw] = await Promise.all([
    tipo && tipo !== "plantio"
      ? []
      : prisma.plantio.findMany({
          where: whereBase,
          include: { fazenda: { select: { nome: true } } },
          orderBy: [{ data: "desc" }],
        }),
    tipo === "plantio"
      ? []
      : prisma.trato.findMany({
          where: {
            ...whereBase,
            ...(tipo && tipo !== "tratos" ? { tipo } : {}),
          },
          include: { fazenda: { select: { nome: true } } },
          orderBy: [{ data: "desc" }],
        }),
    prisma.fazenda.findMany({ select: { id: true, nome: true }, orderBy: { nome: "asc" } }),
    prisma.plantio.findMany({
      where: { safra: { not: null } },
      select: { safra: true },
      distinct: ["safra"],
      orderBy: { safra: "asc" },
    }),
  ]);

  const safras = [
    ...new Set(
      safrasRaw.map((s) => s.safra).filter((s) => typeof s === "string"),
    ),
  ].sort();

  const totalPlantio = plantios.reduce((a, p) => a + p.valor, 0);
  const totalTratos = tratos.reduce((a, t) => a + t.valor, 0);
  const totalGeneral = totalPlantio + totalTratos;

  const plantioPorFazenda = new Map<
    string,
    { fazenda: string; valor: number; area: number; n: number }
  >();
  for (const p of plantios) {
    const f = plantioPorFazenda.get(p.fazendaId) ?? {
      fazenda: p.fazenda.nome,
      valor: 0,
      area: 0,
      n: 0,
    };
    f.valor += p.valor;
    f.area += p.areaHa ?? 0;
    f.n += 1;
    plantioPorFazenda.set(p.fazendaId, f);
  }

  const tratosPorFazenda = new Map<
    string,
    { fazenda: string; valor: number; n: number }
  >();
  for (const t of tratos) {
    const f = tratosPorFazenda.get(t.fazendaId) ?? { fazenda: t.fazenda.nome, valor: 0, n: 0 };
    f.valor += t.valor;
    f.n += 1;
    tratosPorFazenda.set(t.fazendaId, f);
  }

  // Produtos aplicados (agrupados por nome + unidade)
  const produtos = new Map<string, { nome: string; unidade: string; quantidade: number; registros: number }>();
  for (const t of tratos) {
    const lista = (t.produtos ?? []) as Prod[];
    for (const p of lista) {
      const nome = (p.nome ?? "").trim();
      if (!nome) continue;
      const unidade = (p.unidade ?? "").trim() || "un";
      const q = Number(p.quantidade) || 0;
      const key = `${nome}·${unidade}`;
      const item = produtos.get(key) ?? { nome, unidade, quantidade: 0, registros: 0 };
      item.quantidade += q;
      item.registros += 1;
      produtos.set(key, item);
    }
  }
  const produtosLista = [...produtos.values()].sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <>
      <Link
        href="/relatorios"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-3 hover:text-ink"
      >
        <ChevronLeft className="size-4" /> Relatórios
      </Link>
      <PageHeader
        rotulo="relatório · insumos e gastos"
        titulo="Insumos e gastos"
        descricao="O que apliqué e quanto gastei — filtre por safra, fazenda e tipo."
      />

      <form
        action="/relatorios/insumos"
        method="get"
        className="ledger-panel mb-5 grid gap-3 p-4 sm:grid-cols-2"
      >
        <label className="grid gap-1">
          <span className="field-label">Safra</span>
          <select name="safra" defaultValue={safra ?? ""} className="field-input">
            <option value="">Todas</option>
            {safras.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="field-label">Fazenda</span>
          <select name="fazenda" defaultValue={fazenda ?? ""} className="field-input">
            <option value="">Todas</option>
            {fazendasRaw.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="field-label">Tipo</span>
          <select name="tipo" defaultValue={tipo ?? ""} className="field-input">
            <option value="">Plantio e tratos</option>
            <option value="plantio">Só plantio</option>
            <option value="tratos">Só tratos</option>
            {Object.entries(TIPOS_TRATO_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                Tratos · {l}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="field-label">Registro</span>
          <select name="reg" defaultValue={reg ?? ""} className="field-input">
            <option value="">Caderno e projeções</option>
            <option value="real">Caderno de campo</option>
            <option value="proj">Projeções</option>
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button type="submit" className="btn btn-secondary">
            <Filter className="size-4" /> Filtrar
          </button>
          <Link href="/relatorios/insumos" className="btn btn-ghost">
            Limpar
          </Link>
        </div>
      </form>

      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[10px] border border-line bg-line sm:grid-cols-3">
        <CelulaMetrica rotulo="Gastos plantio" valor={fmtMoney(totalPlantio)} legenda={`${plantios.length} registros`} />
        <CelulaMetrica rotulo="Gastos tratos" valor={fmtMoney(totalTratos)} legenda={`${tratos.length} registros`} />
        <CelulaMetrica rotulo="Total gastos" valor={fmtMoney(totalGeneral)} destaque />
      </div>

      {plantioPorFazenda.size > 0 && (
        <section className="mt-8 grid gap-3">
          <h2 className="font-display text-xl text-ink">Plantio por fazenda</h2>
          <div className="overflow-x-auto rounded-[10px] border border-line bg-surface">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-3">
                  <th className="px-3 py-2 font-semibold">Fazenda</th>
                  <th className="px-3 py-2 text-right font-semibold">Área (ha)</th>
                  <th className="px-3 py-2 text-right font-semibold">Registros</th>
                  <th className="px-3 py-2 text-right font-semibold">Gastado</th>
                </tr>
              </thead>
              <tbody>
                {[...plantioPorFazenda.values()]
                  .sort((a, b) => b.valor - a.valor)
                  .map((f) => (
                    <tr key={f.fazenda} className="border-b border-line">
                      <td className="px-3 py-2 font-medium text-ink">{f.fazenda}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink-2">{f.area.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink-2">{f.n}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums text-ink">{fmtMoney(f.valor)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tratosPorFazenda.size > 0 && (
        <section className="mt-8 grid gap-3">
          <h2 className="font-display text-xl text-ink">Tratos por fazenda</h2>
          <div className="overflow-x-auto rounded-[10px] border border-line bg-surface">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-3">
                  <th className="px-3 py-2 font-semibold">Fazenda</th>
                  <th className="px-3 py-2 text-right font-semibold">Registros</th>
                  <th className="px-3 py-2 text-right font-semibold">Gastado</th>
                </tr>
              </thead>
              <tbody>
                {[...tratosPorFazenda.values()]
                  .sort((a, b) => b.valor - a.valor)
                  .map((f) => (
                    <tr key={f.fazenda} className="border-b border-line">
                      <td className="px-3 py-2 font-medium text-ink">{f.fazenda}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink-2">{f.n}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums text-ink">{fmtMoney(f.valor)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="mt-8 grid gap-3">
        <h2 className="font-display text-xl text-ink">Produtos aplicados</h2>
        {produtosLista.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line-strong bg-surface/60 px-4 py-6 text-sm text-ink-2">
            Nenhum produto registrado no filtro. Registre produtos/insumos nos tratos para ver o
            resumo por safra.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-[10px] border border-line bg-surface">
            <table className="w-full min-w-[360px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-3">
                  <th className="px-3 py-2 font-semibold">Produto</th>
                  <th className="px-3 py-2 text-right font-semibold">Quantidade</th>
                  <th className="px-3 py-2 text-right font-semibold">Unidade</th>
                  <th className="px-3 py-2 text-right font-semibold">Registros</th>
                </tr>
              </thead>
              <tbody>
                {produtosLista.map((p) => (
                  <tr key={`${p.nome}·${p.unidade}`} className="border-b border-line">
                    <td className="px-3 py-2 font-medium text-ink">{p.nome}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink">{fmtCount(Math.round(p.quantidade * 100) / 100)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink-2">{p.unidade}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink-2">{p.registros}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}