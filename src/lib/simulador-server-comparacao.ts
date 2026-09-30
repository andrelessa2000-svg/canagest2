/**
 * Consultas do servidor para a comparação de valor entre meses.
 *
 * Traz do banco apenas o necessário: colheitas reais (sem projeção) com o
 * custo por tonelada já calculado pelo modelo da usina, e a série de preços
 * oficiais. O agrupamento e a comparação ficam no módulo puro.
 */

import { prisma } from "./db";
import { userIdAtual } from "./auth";
import { calcularColheita, type ItemDespesa } from "./colheita";
import { TAREFAS_POR_HA } from "./format";
import { areaColhidaHa } from "./rateio";
import type { PrecoMes } from "./historico-preco";
import {
  filtrarColheitas,
  opcoesDe,
  type ColheitaReal,
  type FiltroComparacao,
  type OpcoesComparacaoFiltros,
} from "./simulador-preco-comparacao";

export type DadosComparacao = {
  colheitas: ColheitaReal[];
  precos: PrecoMes[];
  opcoes: OpcoesComparacaoFiltros;
};

/** Série de preços oficiais do usuário, do mais antigo ao mais recente. */
export async function getPrecosOficiais(): Promise<PrecoMes[]> {
  const userId = await userIdAtual();
  const rows = await prisma.historicoPreco.findMany({
    where: { userId },
    orderBy: [{ ano: "asc" }, { mes: "asc" }],
    select: {
      ano: true,
      mes: true,
      precoMedio: true,
      fonte: true,
      atrPorTonelada: true,
      precoKgAtr: true,
    },
  });
  return rows.map((r) => ({
    ano: r.ano,
    mes: r.mes,
    precoMedio: r.precoMedio,
    fonte: r.fonte,
    atrPorTonelada: r.atrPorTonelada,
    precoKgAtr: r.precoKgAtr,
  }));
}

/**
 * Colheitas reais do usuário com mês de moagem e custo por tonelada.
 * Projeções ficam de fora: a comparação é sobre o que foi REALMENTE colhido.
 */
export async function getColheitasReais(where?: Partial<{ safra: string | null; fazendaId: string; usinaId: string }>): Promise<ColheitaReal[]> {
  const userId = await userIdAtual();

  const [talhoes, colheitas, fazendas, usinas] = await Promise.all([
    prisma.talhao.findMany({
      where: { userId },
      select: { id: true, fazendaId: true, areaHa: true },
    }),
    prisma.colheita.findMany({
      where: {
        userId,
        projecao: false,
        ...(where?.safra !== undefined ? { safra: where.safra } : {}),
        ...(where?.fazendaId ? { fazendaId: where.fazendaId } : {}),
        ...(where?.usinaId ? { usinaId: where.usinaId } : {}),
      },
      include: {
        usina: { select: { modelo: true, nome: true } },
        fazenda: { select: { nome: true } },
      },
      orderBy: { data: "asc" },
    }),
    prisma.fazenda.findMany({ where: { userId }, select: { id: true, nome: true } }),
    prisma.usina.findMany({ where: { userId }, select: { id: true, nome: true } }),
  ]);

  const fazendaMap = new Map(fazendas.map((f) => [f.id, f.nome]));
  const usinaMap = new Map(usinas.map((u) => [u.id, u.nome]));

  return colheitas
    .filter((c) => c.toneladas > 0)
    .map((c) => {
      const areaHa = areaColhidaHa(c, c.fazendaId, talhoes);
      const r = calcularColheita({
        modelo: c.usina.modelo,
        tipo: c.tipo,
        toneladas: c.toneladas,
        precoCana: c.precoCana,
        agio: c.agio,
        atrPorTonelada: c.atrPorTonelada,
        precoKgAtr: c.precoKgAtr,
        ctc: c.ctc,
        areaColhida: areaHa * TAREFAS_POR_HA,
        arrendar: c.arrendar,
        tonsPorTarefa: c.tonsPorTarefa,
        tarefasArrendadas: c.tarefasArrendadas,
        adubo: c.adubo,
        precoTonAdubo: c.precoTonAdubo,
        tarefasAdubo: c.tarefasAdubo ?? areaHa * TAREFAS_POR_HA,
        herbicidas: (c.herbicidas ?? []) as ItemDespesa[],
        insumos: (c.insumos ?? []) as ItemDespesa[],
        despesasUsina: (c.despesasUsina ?? []) as ItemDespesa[],
      });

      return {
        id: c.id,
        fazendaId: c.fazendaId,
        fazendaNome: fazendaMap.get(c.fazendaId) ?? c.fazenda.nome,
        usinaId: c.usinaId,
        usinaNome: usinaMap.get(c.usinaId) ?? c.usina.nome,
        usinaModelo: c.usina.modelo,
        safra: c.safra,
        anoMoagem: c.data.getFullYear(),
        mesMoagem: c.data.getMonth() + 1,
        toneladas: c.toneladas,
        custoPorTonelada: r.custoPorTonelada,
        agio: c.agio ?? 0,
      } satisfies ColheitaReal;
    });
}

/** Tudo que o client precisa para as três abas, em uma ida ao servidor. */
export async function getDadosComparacao(): Promise<DadosComparacao> {
  const [colheitas, precos] = await Promise.all([getColheitasReais(), getPrecosOficiais()]);
  return { colheitas, precos, opcoes: opcoesDe(colheitas) };
}

/** Versão filtrada no servidor — mesma filtragem usada no client. */
export async function getDadosComparacaoFiltrados(filtro: FiltroComparacao): Promise<DadosComparacao> {
  const [todas, precos] = await Promise.all([getColheitasReais(), getPrecosOficiais()]);
  return { colheitas: filtrarColheitas(todas, filtro), precos, opcoes: opcoesDe(todas) };
}