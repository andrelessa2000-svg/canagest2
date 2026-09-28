import Link from "next/link";
import { ChevronLeft, Filter, Calendar, Download } from "lucide-react";
import { prisma } from "@/lib/db";
import { fmtMoney, fmtCount } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { CelulaMetrica } from "@/components/stat-cells";
import { userIdAtual } from "@/lib/auth";
import { safrasDoUsuario } from "@/lib/safras-usuario";

export const dynamic = "force-dynamic";

type Filtros = {
  safra?: string;
  fazenda?: string;
  talhao?: string;
  dataIni?: string;
  dataFim?: string;
  reg?: string;
};

type RegistroTalhao = {
  id: string;
  data: Date;
  tipo: string;
  valor?: number;
  tarefas?: number | null;
  talhaoId?: string | null;
  talhoesIds?: unknown;
  alocacoes?: unknown;
  safra?: string | null;
  projecao: boolean;
  fazenda: { nome: string };
  talhao?: { nome: string } | null;
  // Colheita específicos
  toneladas?: number;
  precoCana?: number | null;
  ctc?: number;
};

function fracaoDoTalhao(r: RegistroTalhao, talhao: string, areas: Map<string, number>): number {
  if (!talhao) return 1;
  if (r.talhaoId === talhao) return 1;
  const alocacoes = Array.isArray(r.alocacoes) ? r.alocacoes : [];
  const doTalhao = alocacoes.filter(
    (a) => a && typeof a === "object" && (a as { talhaoId?: string }).talhaoId === talhao,
  );
  if (doTalhao.length > 0) {
    const totalTarefas = alocacoes.reduce(
      (s, a) => s + (Number((a as { tarefas?: number }).tarefas) || 0),
      0,
    );
    const tarefasTalhao = doTalhao.reduce(
      (s, a) => s + (Number((a as { tarefas?: number }).tarefas) || 0),
      0,
    );
    if (totalTarefas > 0) return tarefasTalhao / totalTarefas;
    return doTalhao.length / alocacoes.length;
  }
  const ids = Array.isArray(r.talhoesIds) ? (r.talhoesIds as string[]) : [];
  if (ids.includes(talhao)) {
    if (ids.length === 1) return 1;
    const areaTotal = ids.reduce((s, id) => s + (areas.get(id) ?? 0), 0);
    return areaTotal > 0 ? (areas.get(talhao) ?? 0) / areaTotal : 1 / ids.length;
  }
  return 0;
}

export default async function AnaliseTalhoesPage({
  searchParams,
}: {
  searchParams: Promise<Filtros>;
}) {
  const { safra, fazenda, talhao, dataIni, dataFim, reg } = await searchParams;
  const usuarioId = await userIdAtual();

  const whereBase: Record<string, unknown> = {
    userId: usuarioId,
    ...(safra ? { safra } : {}),
    ...(fazenda ? { fazendaId: fazenda } : {}),
    ...(talhao ? { OR: [{ talhaoId: talhao }, { talhoesIds: { array_contains: [talhao] } }] } : {}),
    ...(reg === "proj" ? { projecao: true } : reg === "real" ? { projecao: false } : {}),
  };

  const dataIniObj = dataIni ? new Date(`${dataIni}T00:00:00`) : null;
  const dataFimObj = dataFim ? new Date(`${dataFim}T23:59:59`) : null;
  if (dataIniObj || dataFimObj) {
    whereBase.data = {};
    if (dataIniObj) whereBase.data = { ...(whereBase.data as object), gte: dataIniObj };
    if (dataFimObj) whereBase.data = { ...(whereBase.data as object), lte: dataFimObj };
  }

  const [plantios, tratos, colheitas, fazendasRaw, talhoesRaw, safras] = await Promise.all([
    prisma.plantio.findMany({
      where: whereBase,
      include: { fazenda: { select: { nome: true } }, talhao: { select: { nome: true } } },
      orderBy: [{ data: "desc" }],
    }),
    prisma.trato.findMany({
      where: whereBase,
      include: { fazenda: { select: { nome: true } }, talhao: { select: { nome: true } } },
      orderBy: [{ data: "desc" }],
    }),
    prisma.colheita.findMany({
      where: whereBase,
      orderBy: [{ data: "desc" }],
      select: {
        id: true,
        data: true,
        tipo: true,
        safra: true,
        projecao: true,
        talhoesColhidos: true,
        toneladas: true,
        precoCana: true,
        ctc: true,
        fazendaId: true,
        fazenda: { select: { nome: true } },
      },
    }),
    prisma.fazenda.findMany({
      where: { userId: usuarioId },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
    prisma.talhao.findMany({
      where: { userId: usuarioId },
      select: { id: true, nome: true, fazendaId: true, areaHa: true },
      orderBy: { nome: "asc" },
    }),
    safrasDoUsuario(),
  ]);

  const areasPorTalhao = new Map(talhoesRaw.map((t) => [t.id, t.areaHa]));
  const frac = (r: RegistroTalhao) => fracaoDoTalhao(r, talhao ?? "", areasPorTalhao);

  type Agregado = {
    talhaoId: string;
    talhaoNome: string;
    fazendaNome: string;
    plantioValor: number;
    plantioArea: number;
    tratoValor: number;
    colheitaValor: number;
    colheitaToneladas: number;
    receita: number;
    nRegistros: number;
  };

  const map = new Map<string, Agregado>();

  function add(r: RegistroTalhao, tipo: "plantio" | "trato" | "colheita") {
    const f = frac(r);
    if (f === 0) return;
    const ids = Array.isArray(r.talhoesIds) ? (r.talhoesIds as string[]) : [];
    const alvoIds = ids.length > 0 ? ids : (r.talhaoId ? [r.talhaoId] : []);
    for (const tid of alvoIds) {
      const t = talhoesRaw.find((x) => x.id === tid);
      if (!t) continue;
      const key = tid;
      const ag = map.get(key) ?? {
        talhaoId: tid,
        talhaoNome: t.nome,
        fazendaNome: r.fazenda.nome,
        plantioValor: 0,
        plantioArea: 0,
        tratoValor: 0,
        colheitaValor: 0,
        colheitaToneladas: 0,
        receita: 0,
        nRegistros: 0,
      };
      if (tipo === "plantio") {
        ag.plantioValor += (r.valor || 0) * f;
        ag.plantioArea += (Number((r as { areaHa?: number }).areaHa) || 0) * f;
      } else if (tipo === "trato") {
        ag.tratoValor += (r.valor || 0) * f;
      } else if (tipo === "colheita") {
        ag.colheitaValor += (r.ctc || 0) * f;
        ag.colheitaToneladas += (r.toneladas || 0) * f;
        ag.receita += ((r.toneladas || 0) * (r.precoCana || 0)) * f;
      }
      ag.nRegistros += 1;
      map.set(key, ag);
    }
  }

  for (const p of plantios) add(p, "plantio");
  for (const t of tratos) add(t, "trato");
  for (const c of colheitas) add(c, "colheita");

  const lista = [...map.values()].sort((a, b) => a.fazendaNome.localeCompare(b.fazendaNome) || a.talhaoNome.localeCompare(b.talhaoNome));

  const totalPlantio = lista.reduce((s, a) => s + a.plantioValor, 0);
  const totalTrato = lista.reduce((s, a) => s + a.tratoValor, 0);
  const totalColheitaCusto = lista.reduce((s, a) => s + a.colheitaValor, 0);
  const totalToneladas = lista.reduce((s, a) => s + a.colheitaToneladas, 0);
  const totalReceita = lista.reduce((s, a) => s + a.receita, 0);
  const totalLucro = totalReceita - totalPlantio - totalTrato - totalColheitaCusto;

  return (
    <>
      <Link
        href="/relatorios"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-ink-3 hover:text-ink"
      >
        <ChevronLeft className="size-4" /> Relatórios
      </Link>
      <PageHeader
        rotulo="relatório · análise por talhão"
        titulo="Análise por talhão"
        descricao="Custos de plantio/trato, produção, receita e lucro por talhão — com rateio por fração nas alocações."
      />

      <form method="GET" className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
          <span className="field-label">Talhão</span>
          <select name="talhao" defaultValue={talhao ?? ""} className="field-input">
            <option value="">Todos</option>
            {talhoesRaw
              .filter((t) => !fazenda || t.fazendaId === fazenda)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="field-label">Data início</span>
          <input type="date" name="dataIni" defaultValue={dataIni ?? ""} className="field-input" />
        </label>
        <label className="grid gap-1">
          <span className="field-label">Data fim</span>
          <input type="date" name="dataFim" defaultValue={dataFim ?? ""} className="field-input" />
        </label>
        <label className="grid gap-1 lg:col-span-2">
          <span className="field-label">Registro</span>
          <select name="reg" defaultValue={reg ?? ""} className="field-input">
            <option value="">Todos</option>
            <option value="real">Caderno de campo</option>
            <option value="proj">Projeções</option>
          </select>
        </label>
        <div className="flex flex-wrap items-end gap-2 lg:col-span-5">
          <button type="submit" className="btn btn-secondary">
            <Filter className="size-4" /> Filtrar
          </button>
          <Link href="/analise-talhoes" className="btn btn-ghost">
            Limpar
          </Link>
          <button type="button" className="btn btn-ghost ml-auto" aria-label="Exportar CSV">
            <Download className="size-4" /> CSV
          </button>
        </div>
      </form>

      {talhao && (
        <p className="mb-3 rounded-lg bg-surface-muted px-3 py-2 text-xs text-ink-2">
          Valores de registros que cobrem vários talhões são rateados pela fração do talhão no registro.
        </p>
      )}

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-line bg-line sm:grid-cols-6 mb-4">
        <CelulaMetrica rotulo="Plantio" valor={fmtMoney(totalPlantio)} legenda={`${plantios.length} reg.`} />
        <CelulaMetrica rotulo="Tratos" valor={fmtMoney(totalTrato)} legenda={`${tratos.length} reg.`} />
        <CelulaMetrica rotulo="Colheita (custo)" valor={fmtMoney(totalColheitaCusto)} legenda={`${colheitas.length} reg.`} />
        <CelulaMetrica rotulo="Toneladas" valor={fmtCount(totalToneladas)} legenda="t" />
        <CelulaMetrica rotulo="Receita" valor={fmtMoney(totalReceita)} />
        <CelulaMetrica rotulo="Lucro" valor={fmtMoney(totalLucro)} destaque />
      </div>

      {lista.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-line-strong bg-surface/60 p-8 text-center">
          <Calendar className="size-12 text-ink-3 mx-auto mb-3" />
          <h3 className="font-display text-lg text-ink mb-1">Nenhum dado no filtro</h3>
          <p className="text-ink-2">Ajuste os filtros ou cadastre plantios, tratos e colheitas para este talhão.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[10px] border border-line bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-muted text-left text-ink-3">
                <th className="p-3 font-medium">Talhão</th>
                <th className="p-3 font-medium">Fazenda</th>
                <th className="p-3 font-medium tnum">Plantio</th>
                <th className="p-3 font-medium tnum">Área plantio (ha)</th>
                <th className="p-3 font-medium tnum">Tratos</th>
                <th className="p-3 font-medium tnum">Colheita custo</th>
                <th className="p-3 font-medium tnum">Toneladas</th>
                <th className="p-3 font-medium tnum">Receita</th>
                <th className="p-3 font-medium tnum">Lucro</th>
                <th className="p-3 font-medium tnum">Registros</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((a) => {
                const lucro = a.receita - a.plantioValor - a.tratoValor - a.colheitaValor;
                return (
                  <tr key={a.talhaoId} className="border-b border-line/50 hover:bg-surface-muted/50">
                    <td className="p-3 font-medium text-ink">{a.talhaoNome}</td>
                    <td className="p-3 text-ink-2">{a.fazendaNome}</td>
                    <td className="p-3 tnum">{fmtMoney(a.plantioValor)}</td>
                    <td className="p-3 tnum">{a.plantioArea.toFixed(2).replace(".", ",")}</td>
                    <td className="p-3 tnum">{fmtMoney(a.tratoValor)}</td>
                    <td className="p-3 tnum">{fmtMoney(a.colheitaValor)}</td>
                    <td className="p-3 tnum">{fmtCount(a.colheitaToneladas)}</td>
                    <td className="p-3 tnum">{fmtMoney(a.receita)}</td>
                    <td className="p-3 tnum font-semibold">{fmtMoney(lucro)}</td>
                    <td className="p-3 tnum text-ink-2">{a.nRegistros}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-line bg-surface-muted font-semibold">
                <td className="p-3" colSpan={2}>TOTAL</td>
                <td className="p-3 tnum">{fmtMoney(totalPlantio)}</td>
                <td className="p-3 tnum">{lista.reduce((s, a) => s + a.plantioArea, 0).toFixed(2).replace(".", ",")}</td>
                <td className="p-3 tnum">{fmtMoney(totalTrato)}</td>
                <td className="p-3 tnum">{fmtMoney(totalColheitaCusto)}</td>
                <td className="p-3 tnum">{fmtCount(totalToneladas)}</td>
                <td className="p-3 tnum">{fmtMoney(totalReceita)}</td>
                <td className="p-3 tnum">{fmtMoney(totalLucro)}</td>
                <td className="p-3 tnum">{lista.reduce((s, a) => s + a.nRegistros, 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </>
  );
}