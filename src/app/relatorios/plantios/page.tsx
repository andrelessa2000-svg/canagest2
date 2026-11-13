import Link from "next/link";
import { ChevronLeft, Filter, Sprout } from "lucide-react";
import { prisma } from "@/lib/db";
import { fmtCount, fmtMoney } from "@/lib/format";
import { TIPOS_PLANTIO_LABEL } from "@/lib/validators";
import { anoDeSafra, normalizarSafra } from "@/lib/safra";
import { userIdAtual } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { PrintButton } from "@/components/print-button";
import { CelulaMetrica } from "@/components/stat-cells";

export const dynamic = "force-dynamic";

const SEM_SAFRA = "Sem safra";

const nf2 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

type Filtros = {
  safra?: string;
  fazenda?: string;
  tipo?: string;
  reg?: string;
};

type Ac = { n: number; real: number; proj: number; tarefas: number };

function novoAc(): Ac {
  return { n: 0, real: 0, proj: 0, tarefas: 0 };
}

function somar(a: Ac, valor: number, proj: boolean, tarefas: number): Ac {
  a.n += 1;
  if (proj) a.proj += valor;
  else a.real += valor;
  a.tarefas += tarefas;
  return a;
}

function ordemSafra(s: string): number {
  return anoDeSafra(s) ?? Number.MAX_SAFE_INTEGER;
}

export default async function PlantiosReportPage({
  searchParams,
}: {
  searchParams: Promise<Filtros>;
}) {
  const userId = await userIdAtual();
  const { safra, fazenda, tipo, reg } = await searchParams;
  const temFiltro = Boolean(safra || fazenda || tipo || reg);

  const [plantios, fazendasRaw, safrasRaw] = await Promise.all([
    prisma.plantio.findMany({
      where: {
        userId,
        ...(safra ? { safra } : {}),
        ...(fazenda ? { fazendaId: fazenda } : {}),
        ...(tipo ? { tipo } : {}),
        ...(reg === "proj" ? { projecao: true } : reg === "real" ? { projecao: false } : {}),
      },
      include: {
        fazenda: { select: { nome: true, proprietario: { select: { nome: true } } } },
      },
      orderBy: [{ data: "desc" }],
    }),
    prisma.fazenda.findMany({
      where: { userId },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
    prisma.plantio.findMany({
      where: { userId },
      select: { safra: true },
      distinct: ["safra"],
    }),
  ]);

  const linhas = plantios.map((p) => ({
    valor: p.valor,
    proj: p.projecao,
    tarefas: p.tarefas ?? 0,
    tipo: p.tipo,
    safra: normalizarSafra(p.safra) ?? SEM_SAFRA,
    fazendaId: p.fazendaId,
    fazendaNome: p.fazenda.nome,
    dono: p.fazenda.proprietario?.nome ?? "Sem dono",
  }));

  const totalReal = linhas.reduce((a, l) => a + (l.proj ? 0 : l.valor), 0);
  const totalProj = linhas.reduce((a, l) => a + (l.proj ? l.valor : 0), 0);

  // Por safra
  const porSafra = new Map<string, Ac>();
  for (const l of linhas) {
    porSafra.set(l.safra, somar(porSafra.get(l.safra) ?? novoAc(), l.valor, l.proj, l.tarefas));
  }
  const safras = [...porSafra.entries()].sort((a, b) => ordemSafra(a[0]) - ordemSafra(b[0]));

  // Por dono
  const porDono = new Map<string, Ac>();
  for (const l of linhas) {
    porDono.set(l.dono, somar(porDono.get(l.dono) ?? novoAc(), l.valor, l.proj, l.tarefas));
  }
  const donos = [...porDono.entries()].sort((a, b) => b[1].real + b[1].proj - (a[1].real + a[1].proj));

  // Por fazenda
  const porFazenda = new Map<
    string,
    Ac & { nome: string; dono: string }
  >();
  for (const l of linhas) {
    const f = porFazenda.get(l.fazendaId) ?? {
      ...novoAc(),
      nome: l.fazendaNome,
      dono: l.dono,
    };
    porFazenda.set(l.fazendaId, {
      ...somar(f, l.valor, l.proj, l.tarefas),
      nome: f.nome,
      dono: f.dono,
    });
  }
  const fazendasResumo = [...porFazenda.values()].sort(
    (a, b) => b.real + b.proj - (a.real + a.proj),
  );

  // Por tipo
  const porTipo = new Map<string, Ac>();
  for (const l of linhas) {
    porTipo.set(l.tipo, somar(porTipo.get(l.tipo) ?? novoAc(), l.valor, l.proj, l.tarefas));
  }
  const tipos = [...porTipo.entries()].sort((a, b) => b[1].real + b[1].proj - (a[1].real + a[1].proj));

  const safrasFiltro = [...new Set(safrasRaw.map((s) => normalizarSafra(s.safra) ?? SEM_SAFRA))].sort(
    (a, b) => ordemSafra(a) - ordemSafra(b),
  );

  return (
    <>
      <Link
        href="/relatorios"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-3 hover:text-ink"
      >
        <ChevronLeft className="size-4" /> Relatórios
      </Link>
      <PageHeader
        rotulo="relatório · plantios"
        titulo="Relatório de plantios"
        descricao="Cana planta e reforma — por safra, dono, fazenda e tipo. Valores para imprimir."
        acao={<PrintButton />}
      />

      <form
        action="/relatorios/plantios"
        method="get"
        className="ledger-panel mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        <label className="grid gap-1">
          <span className="field-label">Safra</span>
          <select name="safra" defaultValue={safra ?? ""} className="field-input">
            <option value="">Todas</option>
            {safrasFiltro.map((s) => (
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
            <option value="">Todos os tipos</option>
            {Object.entries(TIPOS_PLANTIO_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
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
          <Link href="/relatorios/plantios" className="btn btn-ghost">
            Limpar
          </Link>
        </div>
      </form>

      {linhas.length === 0 ? (
        temFiltro ? (
          <p className="rounded-lg border border-dashed border-line-strong bg-surface/60 px-4 py-6 text-sm text-ink-2">
            Nenhum plantio no filtro selecionado.
          </p>
        ) : (
          <EmptyState
            icone={Sprout}
            titulo="Nenhum plantio registrado"
            descricao="Registre os plantios de cana planta e reforma para gerar o relatório."
            ctaTexto="Registrar plantio"
            ctaHref="/plantio/nova"
          />
        )
      ) : (
        <>
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[10px] border border-line bg-line sm:grid-cols-3">
            <CelulaMetrica
              rotulo="Gasto real"
              valor={fmtMoney(totalReal)}
              legenda="caderno de campo"
              destaque
            />
            <CelulaMetrica rotulo="Projeções" valor={fmtMoney(totalProj)} />
            <CelulaMetrica rotulo="Registros" valor={fmtCount(linhas.length)} />
          </div>

          {/* Por safra */}
          <section className="mt-8 grid gap-3">
            <h2 className="font-display text-xl text-ink">Por safra</h2>
            <div className="overflow-x-auto rounded-[10px] border border-line bg-surface">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-3">
                    <th className="px-3 py-2 font-semibold">Safra</th>
                    <th className="px-3 py-2 text-right font-semibold">Registros</th>
                    <th className="px-3 py-2 text-right font-semibold">Gasto real</th>
                    <th className="px-3 py-2 text-right font-semibold">Projeções</th>
                  </tr>
                </thead>
                <tbody>
                  {safras.map(([safraNome, a]) => (
                    <tr key={safraNome} className="border-b border-line">
                      <td className="px-3 py-2 font-medium text-ink">{safraNome}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink-2">{a.n}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums text-ink">
                        {fmtMoney(a.real)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink-2">
                        {fmtMoney(a.proj)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Por dono */}
          <section className="mt-8 grid gap-3">
            <h2 className="font-display text-xl text-ink">Por dono</h2>
            <div className="overflow-x-auto rounded-[10px] border border-line bg-surface">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-3">
                    <th className="px-3 py-2 font-semibold">Dono</th>
                    <th className="px-3 py-2 text-right font-semibold">Tarefas</th>
                    <th className="px-3 py-2 text-right font-semibold">Registros</th>
                    <th className="px-3 py-2 text-right font-semibold">Gasto real</th>
                    <th className="px-3 py-2 text-right font-semibold">Projeções</th>
                  </tr>
                </thead>
                <tbody>
                  {donos.map(([dono, a]) => (
                    <tr key={dono} className="border-b border-line">
                      <td className="px-3 py-2 font-medium text-ink">{dono}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink-2">
                        {nf2.format(a.tarefas)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink-2">{a.n}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums text-ink">
                        {fmtMoney(a.real)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink-2">
                        {fmtMoney(a.proj)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Por fazenda */}
          <section className="mt-8 grid gap-3">
            <h2 className="font-display text-xl text-ink">Por fazenda</h2>
            <div className="overflow-x-auto rounded-[10px] border border-line bg-surface">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-3">
                    <th className="px-3 py-2 font-semibold">Fazenda</th>
                    <th className="px-3 py-2 font-semibold">Dono</th>
                    <th className="px-3 py-2 text-right font-semibold">Tarefas</th>
                    <th className="px-3 py-2 text-right font-semibold">Registros</th>
                    <th className="px-3 py-2 text-right font-semibold">Gasto real</th>
                    <th className="px-3 py-2 text-right font-semibold">Projeções</th>
                  </tr>
                </thead>
                <tbody>
                  {fazendasResumo.map((f) => (
                    <tr key={f.nome} className="border-b border-line">
                      <td className="px-3 py-2 font-medium text-ink">{f.nome}</td>
                      <td className="px-3 py-2 text-ink-2">{f.dono}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink-2">
                        {nf2.format(f.tarefas)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink-2">{f.n}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums text-ink">
                        {fmtMoney(f.real)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink-2">
                        {fmtMoney(f.proj)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Por tipo */}
          <section className="mt-8 grid gap-3">
            <h2 className="font-display text-xl text-ink">Por tipo de plantio</h2>
            <div className="overflow-x-auto rounded-[10px] border border-line bg-surface">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-3">
                    <th className="px-3 py-2 font-semibold">Tipo</th>
                    <th className="px-3 py-2 text-right font-semibold">Tarefas</th>
                    <th className="px-3 py-2 text-right font-semibold">Registros</th>
                    <th className="px-3 py-2 text-right font-semibold">Gasto real</th>
                    <th className="px-3 py-2 text-right font-semibold">Projeções</th>
                  </tr>
                </thead>
                <tbody>
                  {tipos.map(([tipoKey, a]) => (
                    <tr key={tipoKey} className="border-b border-line">
                      <td className="px-3 py-2 font-medium text-ink">
                        {TIPOS_PLANTIO_LABEL[tipoKey] ?? tipoKey}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink-2">
                        {nf2.format(a.tarefas)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink-2">{a.n}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums text-ink">
                        {fmtMoney(a.real)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink-2">
                        {fmtMoney(a.proj)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}
