/**
 * Comparador de projeção de operações (plantio, tratos, colheita).
 *
 * Módulo puro (sem banco, sem React).
 *
 * Cada cenário representa UM modo de executar UMA operação no canavial:
 * - Plantio  : próprio, usina, terceirizado
 * - Tratos   : próprio, terceirizado, usina
 * - Colheita : mecanizada, manual, pela usina, própria
 *
 * O custo de cada item pode ser informado POR HECTARE ou como VALOR TOTAL
 * (gastei X com isso, Y com aquilo…) — o total é dividido pela área.
 * O app soma tudo, dilui o plantio pelos cortes e mostra custo, receita e
 * MARGEM. O objetivo é ver qual modo é mais rentável — nem sempre o mais
 * produtivo dá a maior margem.
 */

export type TipoOperacao = "plantio" | "tratos" | "colheita";

export const TIPOS_OPERACAO_LABEL: Record<TipoOperacao, string> = {
  plantio: "Plantio",
  tratos: "Tratos",
  colheita: "Colheita",
};

export const MODOS_POR_TIPO: Record<TipoOperacao, { id: string; rotulo: string }[]> = {
  plantio: [
    { id: "proprio", rotulo: "Próprio (você faz)" },
    { id: "usina", rotulo: "Usina" },
    { id: "terceirizado", rotulo: "Terceirizado" },
  ],
  tratos: [
    { id: "proprio", rotulo: "Próprio (você faz)" },
    { id: "terceirizado", rotulo: "Terceirizado" },
    { id: "usina", rotulo: "Usina" },
  ],
  colheita: [
    { id: "mecanizada-propria", rotulo: "Mecanizada própria" },
    { id: "mecanizada-terceirizada", rotulo: "Mecanizada terceirizada" },
    { id: "manual", rotulo: "Manual" },
    { id: "usina", rotulo: "Pela usina" },
  ],
};

export function modoLabel(tipo: TipoOperacao, modo: string): string {
  return MODOS_POR_TIPO[tipo]?.find((m) => m.id === modo)?.rotulo ?? modo ?? "—";
}

export type UnidadeCusto = "ha" | "total";

export type ItemCusto = {
  nome: string;
  valor: number;
  /** "ha" = valor por hectare; "total" = valor na área toda */
  unidade: UnidadeCusto;
};

export type CenarioOperacao = {
  id: string;
  tipo: TipoOperacao;
  modo: string;
  nome: string;
  areaHa: number;
  /** t/ha resultante */
  produtividade: number;
  /** R$/t da cana */
  preco: number;
  /** quantas safras o canavial produz */
  cortes: number;
  /** Itens de custo da operação comparada (por ha ou total). */
  custosFoco: ItemCusto[];
  /** Custos das demais operações (R$/ha por corte), para fechar o cálculo. */
  custoColheitaHa: number;
  custoTratosHa: number;
  custoPlantioHa: number;
};

export type ResultadoOperacao = {
  /** R$/ha da operação comparada (totais convertidos pela área). */
  custoFocoHa: number;
  /** R$/ha por corte: receita bruta */
  receitaHa: number;
  /** R$/ha por corte: todas as operações */
  custoHa: number;
  /** R$/ha por corte: receita − custo */
  lucroHa: number;
  /** R$ total por corte */
  receitaTotal: number;
  /** R$ total por corte */
  custoTotal: number;
  /** R$ total por corte */
  lucro: number;
  /** % do lucro sobre a receita */
  margem: number;
  /** % do lucro sobre o custo */
  roi: number;
};

const razao = (num: number, den: number) => (den > 0 ? num / den : 0);

/** Converte os itens para R$/ha (totais ÷ área). */
export function custoFocoHa(c: CenarioOperacao): number {
  const area = Math.max(c.areaHa, 0);
  const porHa = c.custosFoco.reduce((s, i) => {
    const v = Math.max(i.valor, 0);
    return s + (i.unidade === "ha" ? v : area > 0 ? v / area : 0);
  }, 0);
  return area > 0 ? porHa : c.custosFoco.filter((i) => i.unidade === "ha").reduce((s, i) => s + Math.max(i.valor, 0), 0);
}

export function simularOperacao(c: CenarioOperacao): ResultadoOperacao {
  const cortes = Math.max(1, Math.round(c.cortes) || 1);
  const focoHa = custoFocoHa(c);
  const plantioPorCorte = Math.max(c.custoPlantioHa, 0) / cortes;

  let custoHa: number;
  if (c.tipo === "plantio") {
    // Plantio é diluído; colheita e tratos por corte.
    custoHa = focoHa / cortes + Math.max(c.custoColheitaHa, 0) + Math.max(c.custoTratosHa, 0);
  } else if (c.tipo === "colheita") {
    custoHa = focoHa + Math.max(c.custoTratosHa, 0) + plantioPorCorte;
  } else {
    // tratos
    custoHa = focoHa + Math.max(c.custoColheitaHa, 0) + plantioPorCorte;
  }

  const receitaHa = Math.max(c.produtividade, 0) * Math.max(c.preco, 0);
  const lucroHa = receitaHa - custoHa;
  const area = Math.max(c.areaHa, 0);
  const custoTotal = custoHa * area;
  const receita = receitaHa * area;
  const lucro = receita - custoTotal;

  return {
    custoFocoHa: focoHa,
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

/** Ordena do maior para o menor lucro/ha. */
export function rankearOperacoes(
  cenarios: CenarioOperacao[],
): { c: CenarioOperacao; r: ResultadoOperacao }[] {
  return cenarios
    .map((c) => ({ c, r: simularOperacao(c) }))
    .sort((a, b) => b.r.lucroHa - a.r.lucroHa);
}

/** Participação de cada item no custo da operação + ponto de equilíbrio. */
export function detalheOperacao(c: CenarioOperacao): {
  itens: (ItemCusto & { porHa: number; percentual: number })[];
  produtividadeEquilibrio: number;
} {
  const r = simularOperacao(c);
  const porHa = custoFocoHa(c);
  const itens = c.custosFoco.map((i) => {
    const v = Math.max(i.valor, 0);
    const ha = i.unidade === "ha" ? v : c.areaHa > 0 ? v / c.areaHa : 0;
    return {
      ...i,
      porHa: ha,
      percentual: porHa > 0 ? (ha / porHa) * 100 : 0,
    };
  });
  return {
    itens,
    produtividadeEquilibrio: razao(r.custoHa, c.preco),
  };
}