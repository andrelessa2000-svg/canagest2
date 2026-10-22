/**
 * Comparador de projeção de plantio: módulo puro (sem banco, sem React).
 *
 * Compara como plantar (próprio, usina, terceirizado) e protocolos
 * (conjuntos de custos de plantio) variando produtividade. O objetivo é
 * responder: "protocolo caro dá mais produtividade, mas será que a MARGEM
 * é maior?" — a maior produtividade NEM SEMPRE segura maior lucro.
 *
 * Modelo idêntico ao simulador de plantio: custo em R$/ha e por corte,
 * com o plantio diluído pelo número de cortes.
 */

export type ItemCustoPlantio = { nome: string; valorHa: number };

export type ModoExecucao = "proprio" | "usina" | "terceirizado";

export const MODOS_EXECUCAO: Record<ModoExecucao, string> = {
  proprio: "Plantio próprio",
  usina: "Usina",
  terceirizado: "Terceirizado",
};

export type CenarioPlantio = {
  id: string;
  nome: string;
  modo: ModoExecucao;
  areaHa: number;
  /** t/ha resultante do protocolo */
  produtividade: number;
  /** R$/t da cana (do modelo da usina) */
  preco: number;
  /** R$/ha por corte: colheita + CTC + arrendamento */
  custoColheitaHa: number;
  /** R$/ha por corte: tratos (adubação, herbicida...) */
  custoTratosHa: number;
  /** Itens de custo do plantio (mudas, correção, calagem, mecanização...) */
  custosPlantio: ItemCustoPlantio[];
  /** Quantas safras o canavial vai produzir */
  cortes: number;
};

export type ResultadoPlantio = {
  /** R$/ha somando todos os itens do plantio (valor cheio, uma vez) */
  custoPlantioHa: number;
  /** R$/ha por corte: receita bruta */
  receitaHa: number;
  /** R$/ha por corte: colheita + tratos + plantio diluído */
  custoHa: number;
  /** R$/ha por corte: receita − custo */
  lucroHa: number;
  /** R$ total (área toda, por corte) */
  receitaTotal: number;
  /** R$ total */
  custoTotal: number;
  /** R$ total */
  lucro: number;
  /** % do lucro sobre a receita */
  margem: number;
  /** % do lucro sobre o custo */
  roi: number;
};

const razao = (num: number, den: number) => (den > 0 ? num / den : 0);

export function simularPlantio(c: CenarioPlantio): ResultadoPlantio {
  const cortes = Math.max(1, Math.round(c.cortes) || 1);
  const custoPlantioHa = c.custosPlantio.reduce((s, i) => s + Math.max(i.valorHa, 0), 0);
  const custoPlantioPorCorteHa = custoPlantioHa / cortes;
  const custoHa = c.custoColheitaHa + c.custoTratosHa + custoPlantioPorCorteHa;
  const receitaHa = c.produtividade * c.preco;
  const lucroHa = receitaHa - custoHa;
  const custoTotal = custoHa * c.areaHa;
  const receita = receitaHa * c.areaHa;
  const lucro = receita - custoTotal;
  return {
    custoPlantioHa,
    receitaHa,
    custoHa,
    lucroHa,
    receitaTotal: receita,
    custoTotal,
    lucro,
    margem: receita > 0 ? (lucro / receita) * 100 : 0,
    roi: custoTotal > 0 ? (lucro / custoTotal) * 100 : 0,
  };
}

/**
 * Ordena do maior para o menor lucro/ha — primeiro é o mais lucrativo.
 * Guarda o id do melhor para destacar na interface.
 */
export function rankearCenarios(
  cenarios: CenarioPlantio[],
): { c: CenarioPlantio; r: ResultadoPlantio }[] {
  return cenarios
    .map((c) => ({ c, r: simularPlantio(c) }))
    .sort((a, b) => b.r.lucroHa - a.r.lucroHa);
}

/**
 * Quanto cada item de plantio pesa no custo/ha (para ver onde dá para
 * economizar) e a produtividade mínima para empatar dado o preço.
 */
export function detalhePlantio(c: CenarioPlantio): {
  itens: (ItemCustoPlantio & { percentual: number })[];
  produtividadeEquilibrio: number;
} {
  const r = simularPlantio(c);
  const itens = c.custosPlantio.map((i) => ({
    ...i,
    percentual: r.custoPlantioHa > 0 ? (Math.max(i.valorHa, 0) / r.custoPlantioHa) * 100 : 0,
  }));
  return {
    itens,
    produtividadeEquilibrio: razao(r.custoHa, c.preco),
  };
}