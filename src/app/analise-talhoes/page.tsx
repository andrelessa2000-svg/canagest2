import Link from "next/link";
import { Filter, Layers } from "lucide-react";
import { prisma } from "@/lib/db";
import { fmtMoney, fmtCount } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { CelulaMetrica } from "@/components/stat-cells";
import { EmptyState } from "@/components/empty-state";
import { userIdAtual } from "@/lib/auth";
import { safrasDoUsuario } from "@/lib/safras-usuario";
import { calcularColheita, type ItemDespesa } from "@/lib/colheita";
import { areaColhidaHa } from "@/lib/rateio";
import { agregarPorTalhao, type Agregado } from "@/lib/analise";
import { TAREFAS_POR_HA } from "@/lib/format";

export const dynamic = "force-dynamic";

type Filtros = {
  safra?: string;
  fazenda?: string;
  talhao?: string;
  dataIni?: string;
  dataFim?: string;
  reg?: string;
};

const MENSAGEM_VAZIO =
  "Ajuste os filtros ou cadastre plantios, tratos e colheitas para ver o resultado por talhão.";

export default async function AnaliseTalhoesPage({
  searchParams,
}: {
  searchParams: Promise<Filtros>;
}) {
  const { safra, fazenda, talhao, dataIni, dataFim, reg } = await searchParams;
  const userId = await userIdAtual();

  // O filtro de talhão é aplicado depois do rateio: assim registros de
  // "fazenda inteira" e colheitas antigas sem talhões também entram na conta.
  const where: Record<string, unknown> = {
    userId,
    ...(safra ? { safra } : {}),
    ...(fazenda ? { fazendaId: fazenda } : {}),
    ...(reg === "proj" ? { projecao: true } : reg === "real" ? { projecao: false } : {}),
  };
  const intervalo: { gte?: Date; lte?: Date } = {};
  if (dataIni) intervalo.gte = new Date(`${dataIni}T00:00:00`);
  if (dataFim) intervalo.lte = new Date(`${dataFim}T23:59:59`);
  if (intervalo.gte || intervalo.lte) where.data = intervalo;

  const [plantios, tratos, colheitas, fazendas, talhoes, safras] = await Promise.all([
    prisma.plantio.findMany({ where }),
    prisma.trato.findMany({ where }),
    prisma.colheita.findMany({ where, include: { usina: { select: { modelo: true } } } }),
    prisma.fazenda.findMany({
      where: { userId },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
    prisma.talhao.findMany({
      where: { userId },
      select: { id: true, nome: true, fazendaId: true, areaHa: true },
      orderBy: { nome: "asc" },
    }),
    safrasDoUsuario(),
  ]);

  const colheitasCalculadas = colheitas.map((c) => {
    const ha = areaColhidaHa(c, c.fazendaId, talhoes);
    const r = calcularColheita({
      modelo: c.usina.modelo,
      tipo: c.tipo,
      toneladas: c.toneladas,
      precoCana: c.precoCana,
      agio: c.agio,
      atrPorTonelada: c.atrPorTonelada,
      precoKgAtr: c.precoKgAtr,
      ctc: c.ctc,
      areaColhida: ha * TAREFAS_POR_HA,
      arrendar: c.arrendar,
      tonsPorTarefa: c.tonsPorTarefa,
      tarefasArrendadas: c.tarefasArrendadas,
      adubo: c.adubo,
      precoTonAdubo: c.precoTonAdubo,
      tarefasAdubo: c.tarefasAdubo ?? ha * TAREFAS_POR_HA,
      herbicidas: (c.herbicidas ?? []) as ItemDespesa[],
      insumos: (c.insumos ?? []) as ItemDespesa[],
      despesasUsina: (c.despesasUsina ?? []) as ItemDespesa[],
    });
    return {
      fazendaId: c.fazendaId,
      talhoesColhidos: c.talhoesColhidos,
      toneladas: c.toneladas,
      areaHa: ha,
      receita: r.receita,
      despesas: r.totalDespesas,
    };
  });

  const lista = agregarPorTalhao({
    talhoes,
    nomeFazenda: new Map(fazendas.map((f) => [f.id, f.nome])),
    plantios,
    tratos,
    colheitas: colheitasCalculadas,
    talhaoFiltro: talhao || undefined,
  });
  const custo = (a: Agregado) => a.plantio + a.tratos + a.colheitaCusto;
  const lucro = (a: Agregado) => a.receita - custo(a);
  const soma = (f: (a: Agregado) => number) => lista.reduce((s, a) => s + f(a), 0);
  const tot = {
    plantio: soma((a) => a.plantio),
    tratos: soma((a) => a.tratos),
    colheita: soma((a) => a.colheitaCusto),
    toneladas: soma((a) => a.toneladas),
    ha: soma((a) => a.haColhidos),
    receita: soma((a) => a.receita),
  };
  const totalLucro = tot.receita - tot.plantio - tot.tratos - tot.colheita;
  const prod = (ton: number, ha: number) => (ha > 0 ? `${(ton / ha).toFixed(1).replace(".", ",")} t/ha` : "—");

  return (
    <>
      <PageHeader
        rotulo="Ferramentas"
        titulo="Análise por talhão"
        descricao="Custo, produção e lucro de cada talhão. Registros que cobrem vários talhões são divididos pela área (ou pelas tarefas informadas); nada é contado em duplicidade."
      />

      <form method="GET" className="card mb-6 grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <label className="grid gap-1.5">
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
        <label className="grid gap-1.5">
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
        <label className="grid gap-1.5">
          <span className="field-label">Talhão</span>
          <select name="talhao" defaultValue={talhao ?? ""} className="field-input">
            <option value="">Todos</option>
            {talhoes
              .filter((t) => !fazenda || t.fazendaId === fazenda)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="field-label">De</span>
          <input type="date" name="dataIni" defaultValue={dataIni ?? ""} className="field-input" />
        </label>
        <label className="grid gap-1.5">
          <span className="field-label">Até</span>
          <input type="date" name="dataFim" defaultValue={dataFim ?? ""} className="field-input" />
        </label>
        <label className="grid gap-1.5">
          <span className="field-label">Registro</span>
          <select name="reg" defaultValue={reg ?? ""} className="field-input">
            <option value="">Todos</option>
            <option value="real">Caderno de campo</option>
            <option value="proj">Projeções</option>
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-6">
          <button type="submit" className="btn btn-primary">
            <Filter className="size-4" /> Aplicar filtros
          </button>
          <Link href="/analise-talhoes" className="btn btn-ghost">
            Limpar
          </Link>
        </div>
      </form>

      <div className="metric-grid mb-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <CelulaMetrica rotulo="Plantio" valor={fmtMoney(tot.plantio)} />
        <CelulaMetrica rotulo="Tratos" valor={fmtMoney(tot.tratos)} />
        <CelulaMetrica rotulo="Colheita (custo)" valor={fmtMoney(tot.colheita)} />
        <CelulaMetrica rotulo="Produção" valor={`${fmtCount(tot.toneladas)} t`} legenda={prod(tot.toneladas, tot.ha)} />
        <CelulaMetrica rotulo="Receita" valor={fmtMoney(tot.receita)} />
        <CelulaMetrica rotulo="Lucro" valor={fmtMoney(totalLucro)} destaque />
      </div>

      {lista.length === 0 ? (
        <EmptyState icone={Layers} titulo="Nada para mostrar" descricao={MENSAGEM_VAZIO} />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Talhão</th>
                <th>Fazenda</th>
                <th className="num">Plantio</th>
                <th className="num">Tratos</th>
                <th className="num">Colheita</th>
                <th className="num">Produção</th>
                <th className="num">t/ha</th>
                <th className="num">Receita</th>
                <th className="num">Lucro</th>
                <th className="num">Lucro/ha</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((a) => {
                const l = lucro(a);
                return (
                  <tr key={a.talhaoId}>
                    <td className="font-semibold text-ink">{a.talhaoNome}</td>
                    <td className="text-ink-2">{a.fazendaNome}</td>
                    <td className="num">{fmtMoney(a.plantio)}</td>
                    <td className="num">{fmtMoney(a.tratos)}</td>
                    <td className="num">{fmtMoney(a.colheitaCusto)}</td>
                    <td className="num">{fmtCount(a.toneladas)} t</td>
                    <td className="num">{prod(a.toneladas, a.haColhidos)}</td>
                    <td className="num">{fmtMoney(a.receita)}</td>
                    <td className={`num font-semibold ${l < 0 ? "text-danger-strong" : "text-accent-strong"}`}>
                      {fmtMoney(l)}
                    </td>
                    <td className="num">{a.areaHa > 0 ? fmtMoney(l / a.areaHa) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>Total</td>
                <td className="num">{fmtMoney(tot.plantio)}</td>
                <td className="num">{fmtMoney(tot.tratos)}</td>
                <td className="num">{fmtMoney(tot.colheita)}</td>
                <td className="num">{fmtCount(tot.toneladas)} t</td>
                <td className="num">{prod(tot.toneladas, tot.ha)}</td>
                <td className="num">{fmtMoney(tot.receita)}</td>
                <td className="num">{fmtMoney(totalLucro)}</td>
                <td className="num">—</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </>
  );
}
