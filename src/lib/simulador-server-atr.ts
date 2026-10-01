/**
 * Consultas do servidor para o comparativo de ATR.
 *
 * Traz o mínimo necessário: os meses em que a usina anunciou o ATR e as
 * colheitas reais com o valor bruto que cada uma rendeu. Todo o cálculo fica
 * no módulo puro `simulador-atr-comparacao`.
 */

import { prisma } from "./db";
import { userIdAtual } from "./auth";
import { calcularColheita, lerDividas } from "./colheita";


import {
  mesesComAtr,
  proximoMesAtr,
  serieAtrComparativo,
  type ColheitaComReceita,
  type MesAtr,
} from "./simulador-atr-comparacao";

/* ============================================================
   1. Meses com ATR anunciado
   ============================================================ */

/**
 * Só os meses que têm `precoKgAtr`. `precoMedio` (R$/t) não participa mais do
 * comparativo: o que muda de um mês para o outro é o preço do ATR.
 */
export async function getMesesAtr(): Promise<MesAtr[]> {
  const userId = await userIdAtual();
  const rows = await prisma.historicoPreco.findMany({
    where: { userId, precoKgAtr: { gt: 0 } },
    orderBy: [{ ano: "asc" }, { mes: "asc" }],
    select: { ano: true, mes: true, precoKgAtr: true },
  });
  return rows.map((r) => ({ ano: r.ano, mes: r.mes, precoKgAtr: r.precoKgAtr as number }));
}

/* ============================================================
   2. Colheitas reais com o valor bruto recebido
   ============================================================ */

/**
 * Colheitas reais (projeções ficam de fora) com a receita bruta calculada
 * pelo modelo da usina. �0 esse o número que o comparativo reavalia.
 */
export async function getColheitasComReceita(): Promise<ColheitaComReceita[]> {
  const userId = await userIdAtual();

  const colheitas = await prisma.colheita.findMany({
    where: { userId, projecao: false },
    include: {
      usina: { select: { modelo: true, nome: true } },
      fazenda: { select: { nome: true } },
      custo: true,
    },
    orderBy: { data: "asc" },
  });

  return colheitas
    .filter((c) => c.toneladas > 0)
    .map((c) => {
const custo = c.custo;
      const r = calcularColheita({
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
      });

      return {
        id: c.id,
        fazendaId: c.fazendaId,
        fazendaNome: c.fazenda.nome,
        usinaId: c.usinaId,
        usinaNome: c.usina.nome,
        safra: c.safra,
        anoMoagem: c.data.getFullYear(),
        mesMoagem: c.data.getMonth() + 1,
        toneladas: c.toneladas,
        receitaBruta: r.receita,
      } satisfies ColheitaComReceita;
    });
}

/* ============================================================
   3. Payload do client
   ============================================================ */

export type DadosAtr = {
  meses: MesAtr[];
  colheitas: ColheitaComReceita[];
  /** �altimo mês com ATR e o mês seguinte, que é o simulado. */
  ultimo: MesAtr | null;
  proximo: { ano: number; mes: number; rotulo: string } | null;
  /** R$/kg do último ATR � ponto de partida sugerido para a simulação. */
  ultimoAtr: number | null;
};

export async function getDadosAtr(): Promise<DadosAtr> {
  const [meses, colheitas] = await Promise.all([getMesesAtr(), getColheitasComReceita()]);
  const ordenados = mesesComAtr(meses);
  const ultimo = ordenados.length > 0 ? ordenados[ordenados.length - 1] : null;
  return {
    meses,
    colheitas,
    ultimo,
    proximo: proximoMesAtr(meses),
    ultimoAtr: ultimo ? ultimo.precoKgAtr : null,
  };
}

export { serieAtrComparativo };


