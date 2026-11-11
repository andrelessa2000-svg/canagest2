/**
 * Modelo de cálculo do módulo de Projeções e Comparações de Custos.
 *
 * Módulo puro (sem banco, sem React), testável isoladamente.
 *
 * Duas análises independentes:
 *  1. Custo de serviço agrícola (execução própria vs terceirizada/usina).
 *  2. Rentabilidade de protocolo agrícola (custo × produtividade × preço).
 *
 * Itens de custo: cada um pode ser por hectare ("ha") ou valor total ("total"),
 * convertido pela área. Nada aqui toca no financeiro nem no caderno de campo.
 */

import { SACOS_ADUBO_POR_TAREFA } from "./colheita";
import { TAREFAS_POR_HA } from "./format";

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
   Insumos: adubo (por tarefa) e aplicação de produto (dose/ha)
   ============================================================ */

export type CicloAdubo = "planta" | "soca";

export type ResultadoAdubo = {
  sacosPorTarefa: number;
  sacos: number;
  kg: number;
  toneladas: number;
};

/**
 * Quantidade de adubo para a área em tarefas.
 * Regra da casa (mesma da colheita): cana planta 4 sacos de 50 kg por tarefa
 * (5 tarefas = 1 t); cana soca 3 sacos por tarefa (6,67 tarefas ≈ 1 t).
 */
export function calcularAdubo(tarefas: number, ciclo: CicloAdubo): ResultadoAdubo {
  const sacosPorTarefa = SACOS_ADUBO_POR_TAREFA[ciclo];
  const sacos = Math.max(tarefas, 0) * sacosPorTarefa;
  const kg = sacos * 50;
  return { sacosPorTarefa, sacos, kg, toneladas: kg / 1000 };
}

/** Custo do adubo: toneladas necessárias × valor da tonelada. */
export function custoAdubo(tarefas: number, ciclo: CicloAdubo, precoTonelada: number): number {
  return calcularAdubo(tarefas, ciclo).toneladas * Math.max(precoTonelada, 0);
}

/** Quantidade de produto (L ou kg) para a área: dose por ha × área em ha. */
export function quantidadeProduto(dosePorHa: number, areaHa: number): number {
  return Math.max(dosePorHa, 0) * Math.max(areaHa, 0);
}

/** Como o rendimento do produto é informado: área coberta por litro/quilo. */
export type ModoProduto = "ha-L" | "ha-kg" | "tarefa-L" | "tarefa-kg";

/**
 * Quantidade de produto a comprar a partir do rendimento informado
 * (quantos ha ou tarefas um litro/quilo cobre) e da área em tarefas.
 */
export function quantidadePorRendimento(
  modo: ModoProduto,
  rende: number, // ha ou tarefas cobertos por 1 L/kg
  areaTarefas: number,
): { unidade: "L" | "kg"; quantidade: number } {
  const unidade: "L" | "kg" = modo.endsWith("L") ? "L" : "kg";
  const area =
    modo.startsWith("ha")
      ? Math.max(areaTarefas, 0) / TAREFAS_POR_HA
      : Math.max(areaTarefas, 0);
  return { unidade, quantidade: rende > 0 ? area / rende : 0 };
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
  adubacao: "Adubação / readubação",
  herbicida: "Herbicida",
  defensivo: "Inseticida / fungicida (praga e doença)",
  "tratos-culturais": "Cortador de soqueira e outros tratos",
  "preparo-solo": "Preparo do solo",
  cultivo: "Cultivo",
  outro: "Outro (ex.: aplicação foliar)",
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
export function rankearProtocolos<T extends ProtocoloProj>(
  protocolos: T[],
): { p: T; r: ResultadoProtocolo }[] {
  return protocolos
    .map((p) => ({ p, r: calcularProtocolo(p) }))
    .sort((a, b) => b.r.lucroHa - a.r.lucroHa);
}