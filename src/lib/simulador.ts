/**
 * Simulador de decisão: módulo puro (sem banco, sem React) para poder ser testado.
 *
 * Modelo: todo custo é expresso em R$ por hectare e por corte (safra).
 * O plantio acontece uma vez e serve a vários cortes, então é diluído
 * pelo número de cortes esperado.
 */

export type ColheitaMedia = {
  tipo: string;
  toneladas: number;
  areaHa: number;
  receita: number;
  despesas: number;
};
export type PlantioMedia = { valor: number; areaHa: number };
export type TratoMedia = { valor: number };

export type MediasHistoricas = {
  /** t/ha ponderada pela área colhida */
  produtividade: number;
  produtividadePorTipo: Record<string, number>;
  /** R$/t: receita total / toneladas totais */
  precoMedio: number;
  /** R$/ha colhido por corte (CTC, arrendamento, adubo, herbicida, insumos, despesas da usina) */
  custoColheitaHa: number;
  /** R$ de tratos por ha colhido */
  custoTratosHa: number;
  /** R$/ha plantado, valor cheio (ainda não diluído em cortes) */
  custoPlantioHa: number;
  haColhidos: number;
  qtdColheitas: number;
  qtdTratos: number;
  qtdPlantios: number;
  plantiosSemArea: number;
};

const razao = (num: number, den: number) => (den > 0 ? num / den : 0);

export function calcularMedias(
  colheitas: ColheitaMedia[],
  plantios: PlantioMedia[],
  tratos: TratoMedia[],
): MediasHistoricas {
  const comArea = colheitas.filter((c) => c.areaHa > 0 && c.toneladas > 0);
  const haColhidos = comArea.reduce((s, c) => s + c.areaHa, 0);
  const tonComArea = comArea.reduce((s, c) => s + c.toneladas, 0);

  const porTipo: Record<string, { ton: number; ha: number }> = {};
  for (const c of comArea) {
    const acc = (porTipo[c.tipo] ??= { ton: 0, ha: 0 });
    acc.ton += c.toneladas;
    acc.ha += c.areaHa;
  }
  const produtividadePorTipo: Record<string, number> = {};
  for (const [tipo, v] of Object.entries(porTipo)) {
    produtividadePorTipo[tipo] = razao(v.ton, v.ha);
  }

  const tonTotal = colheitas.reduce((s, c) => s + Math.max(c.toneladas, 0), 0);
  const receitaTotal = colheitas.reduce((s, c) => s + (c.toneladas > 0 ? c.receita : 0), 0);

  const plantiosComArea = plantios.filter((p) => p.areaHa > 0);

  return {
    produtividade: razao(tonComArea, haColhidos),
    produtividadePorTipo,
    precoMedio: razao(receitaTotal, tonTotal),
    custoColheitaHa: razao(
      comArea.reduce((s, c) => s + c.despesas, 0),
      haColhidos,
    ),
    custoTratosHa: razao(
      tratos.reduce((s, t) => s + t.valor, 0),
      haColhidos,
    ),
    custoPlantioHa: razao(
      plantiosComArea.reduce((s, p) => s + p.valor, 0),
      plantiosComArea.reduce((s, p) => s + p.areaHa, 0),
    ),
    haColhidos,
    qtdColheitas: colheitas.length,
    qtdTratos: tratos.length,
    qtdPlantios: plantios.length,
    plantiosSemArea: plantios.length - plantiosComArea.length,
  };
}

export type Cenario = {
  id: string;
  nome: string;
  areaHa: number;
  produtividade: number;
  preco: number;
  custoColheitaHa: number;
  custoTratosHa: number;
  custoPlantioHa: number;
  cortes: number;
};

export type Resultado = {
  toneladas: number;
  receita: number;
  custoPlantioPorCorteHa: number;
  custoHa: number;
  custoTotal: number;
  lucro: number;
  lucroHa: number;
  roi: number;
  margem: number;
  /** R$/t de custo: abaixo disso de preço já dá prejuízo */
  custoPorTonelada: number;
  /** t/ha mínima para empatar, dado o preço */
  produtividadeEquilibrio: number;
};

export function simular(c: Cenario): Resultado {
  const cortes = Math.max(1, Math.round(c.cortes) || 1);
  const custoPlantioPorCorteHa = c.custoPlantioHa / cortes;
  const custoHa = c.custoColheitaHa + c.custoTratosHa + custoPlantioPorCorteHa;
  const receitaHa = c.produtividade * c.preco;
  const lucroHa = receitaHa - custoHa;
  const custoTotal = custoHa * c.areaHa;
  const receita = receitaHa * c.areaHa;
  const lucro = receita - custoTotal;
  return {
    toneladas: c.produtividade * c.areaHa,
    receita,
    custoPlantioPorCorteHa,
    custoHa,
    custoTotal,
    lucro,
    lucroHa,
    roi: custoTotal > 0 ? (lucro / custoTotal) * 100 : 0,
    margem: receita > 0 ? (lucro / receita) * 100 : 0,
    custoPorTonelada: razao(custoHa, c.produtividade),
    produtividadeEquilibrio: razao(custoHa, c.preco),
  };
}

export const VARIACOES_PRODUTIVIDADE = [-20, -10, 0, 10, 20] as const;
export const VARIACOES_PRECO = [-10, 0, 10] as const;

/** Lucro total (R$) para combinações de produtividade × preço. */
export function sensibilidade(c: Cenario): { produtividade: number; preco: number; lucro: number }[][] {
  return VARIACOES_PRECO.map((vp) =>
    VARIACOES_PRODUTIVIDADE.map((vt) => ({
      produtividade: vt,
      preco: vp,
      lucro: simular({
        ...c,
        produtividade: c.produtividade * (1 + vt / 100),
        preco: c.preco * (1 + vp / 100),
      }).lucro,
    })),
  );
}
