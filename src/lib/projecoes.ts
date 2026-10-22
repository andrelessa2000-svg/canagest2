/**
 * Modelo de cálculo do módulo de Projeções e Comparações de Custos.
 *
 * Módulo puro (sem banco, sem React), testável isoladamente.
 *
 * Duas análises independentes:
 *  1. Custo de servirÇO agrícola (execução própria vs terceirizada/usina).
 *  2. Rentabilidade de protocolo agrícola (custo × produtividade × preço).
 *
 * Itens de custo: cada um pode ser por hectare ("ha") ou valor total ("total"),
 * convertido pela área. Nada aqui toca no financeiro nem no caderno de campo.
 */

export type UnidadeCusto = "ha" | "total";

export type ItemCusto = {
  nome: string;
  valor: number;
  unidade: UnidadeCusto;
};

/** Soma os itens de custo em R$/ha (valores "total" divididos pela área). */
export function custoPorHa(itens: ItemCusto[], areaHa: number): number {
  const area = Math.max(areaHa, 0);
  let porHa = 0;
  for (const i of itens) {
    const v = Math.max(i.valor, 0);
    porHa += i.unidade === "ha" ? v : area > 0 ? v / area : 0;
  }
  // Sem área, devolve somente o que já era por ha.
  if (area <= 0) {
    porHa = itens.filter((i) => i.unidade === "ha").reduce((s, i) => s + Math.max(i.valor, 0), 0);
  }
  return porHa;
}

/* ============================================================
   1. Comparação de custo de serviço agrícola
   ============================================================ */

export type TipoServicoProj =
  | "plantio"
  | "adubacao"
  | "herbicida"
  | "defensivo"
  | "tratos-culturais"
  | "preparo-solo"
  | "cultivo"
  | "outro";

export const TIPOS_SERVICO_LABEL: Record<TipoServicoProj, string> = {
  plantio: "Plantio",
  adubacao: "Adubação",
  herbicida: "Herbicida",
  defensivo: "Defensivo",
  "tratos-culturais": "Tratos culturais",
  "preparo-solo": "Preparo do solo",
  cultivo: "Cultivo",
  outro: "Outro",
};

export type TipoExecucao = "propria" | "terceirizada" | "usina";

export const TIPOS_EXECUCAO_LABEL: Record<TipoExecucao, string> = {
  propria: "Execução própria",
  terceirizada: "Terceirizada",
  usina: "Pela usina",
};

export type ServicoComparacao = {
  id: string;
  nome: string;
  safra?: string | null;
  fazendaId?: string | null;
  tipo: TipoServicoProj;
  areaHa: number;
  tipoExecucao: TipoExecucao;
  custos: ItemCusto[];
  // Rentabilidade opcional: produtividade (t/ha) e preço (R$/t).
  produtividade: number | null;
  preco: number | null;
};

export type ResultadoServico = {
  custoServicoHa: number;
  custoServicoTotal: number;
  // Rentabilidade, se informada.
  receitaHa: number;
  lucroHa: number;
  margem: number;
};

export function calcularServico(s: ServicoComparacao): ResultadoServico {
  const custoServicoHa = custoPorHa(s.custos, s.areaHa);
  const custoServicoTotal = custoServicoHa * Math.max(s.areaHa, 0);
  const receitaHa = s.produtividade && s.preco ? s.produtividade * s.preco : 0;
  const lucroHa = receitaHa - custoServicoHa;
  return {
    custoServicoHa,
    custoServicoTotal,
    receitaHa,
    lucroHa,
    margem: receitaHa > 0 ? (lucroHa / receitaHa) * 100 : 0,
  };
}

/* ============================================================
   2. Rentabilidade de protocolo agrícola
   ============================================================ */

export type ProtocoloProj = {
  id: string;
  nome: string;
  safra?: string | null;
  fazendaId?: string | null;
  areaHa: number;
  produtividade: number; // t/ha
  preco: number; // R$/t
  cortes: number; // quantas safras
  custos: ItemCusto[];
};

export type ResultadoProtocolo = {
  custoPlantioHa: number;
  custoPlantioPorCorteHa: number;
  receitaHa: number;
  custoHa: number;
  lucroHa: number;
  receitaTotal: number;
  custoTotal: number;
  lucro: number;
  margem: number;
  roi: number;
};

export function calcularProtocolo(p: ProtocoloProj): ResultadoProtocolo {
  const cortes = Math.max(1, Math.round(p.cortes) || 1);
  const custoPlantioHa = custoPorHa(p.custos, p.areaHa);
  const custoPlantioPorCorteHa = custoPlantioHa / cortes;
  const receitaHa = p.produtividade * p.preco;
  const custoHa = custoPlantioPorCorteHa; // por ora, o protocolo trata só do plantio diluído
  const lucroHa = receitaHa - custoHa;
  const area = Math.max(p.areaHa, 0);
  const custoTotal = custoHa * area;
  const receita = receitaHa * area;
  const lucro = receita - custoTotal;
  return {
    custoPlantioHa,
    custoPlantioPorCorteHa,
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

/** Ordena protocolos pelo maior lucro/ha — primeiro é o de maior rentabilidade. */
export function rankearProtocolos(
  protocolos: ProtocoloProj[],
): { p: ProtocoloProj; r: ResultadoProtocolo }[] {
  return protocolos
    .map((p) => ({ p, r: calcularProtocolo(p) }))
    .sort((a, b) => b.r.lucroHa - a.r.lucroHa);
}