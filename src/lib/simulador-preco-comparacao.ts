/**
 * Comparação de valor entre meses + cenário de preço + alta/baixa.
 *
 * Módulo puro (sem banco, sem React) para poder ser testado.
 *
 * Terminologia (não trocar):
 * - REAL      valor oficial cadastrado em HistoricoPreco;
 * - SIMULAÇÃO valor informado pelo usuário, não representa valor oficial;
 * - PROJEÇÃO  estimativa futura baseada em hipótese (média móvel).
 */

import { mediaMovel, obterPreco, ordenar, rotulo, type PrecoMes } from "./historico-preco";

/* ============================================================
   1. Origem do valor — vocabulário da interface
   ============================================================ */

export type OrigemValor = "real" | "simulacao" | "projecao";

export const ROTULO_ORIGEM: Record<OrigemValor, { sigla: string; titulo: string; descricao: string }> = {
  real: {
    sigla: "REAL",
    titulo: "REAL",
    descricao: "Valor oficial cadastrado",
  },
  simulacao: {
    sigla: "SIMULAÇÃO",
    titulo: "SIMULAÇÃO",
    descricao: "Valor informado pelo usuário. Não representa valor oficial.",
  },
  projecao: {
    sigla: "PROJEÇÃO",
    titulo: "PROJEÇÃO",
    descricao: "Estimativa futura baseada em hipótese",
  },
};

/** Classes de selo por origem — tokens do tema, sem cores avulsas do Tailwind. */
export const CLASSE_ORIGEM: Record<OrigemValor, string> = {
  real: "bg-success-soft text-success-strong",
  simulacao: "bg-warning-soft text-warning-strong",
  projecao: "bg-info-soft text-info-strong",
};

/** Cor de série equivalente, usada nos gráficos. */
export const COR_ORIGEM: Record<OrigemValor, string> = {
  real: "var(--success)",
  simulacao: "var(--warning)",
  projecao: "var(--info)",
};

/* ============================================================
   2. Entradas
   ============================================================ */

export type ColheitaReal = {
  id: string;
  fazendaId: string;
  fazendaNome: string;
  usinaId: string;
  usinaNome: string;
  usinaModelo: string;
  safra: string | null;
  /** Ano da moagem (ano civil da data da colheita) */
  anoMoagem: number;
  /** Mês da moagem, 1-12 */
  mesMoagem: number;
  toneladas: number;
  /** R$/t de custo já calculado da colheita real (0 quando não informado) */
  custoPorTonelada: number;
  /** Ágio contratado — entra na receita do modelo Pindorama. Opcional para
   * fixtures de teste; sem valor a receita fica só no preço. */
  agio?: number;
};

export type Periodo = {
  de: { ano: number; mes: number } | null;
  ate: { ano: number; mes: number } | null;
};

/**
 * `safra` distingue três estados: `undefined` não filtra, `null` busca
 * somente registros sem safra, string busca aquela safra específica.
 */
export type FiltroComparacao = {
  safra?: string | null;
  fazendaId?: string;
  usinaId?: string;
  periodo?: Periodo;
};

/** Posição absoluta de um mês na linha do tempo. */
function chave(ano: number, mes: number): number {
  return ano * 12 + (mes - 1);
}

/* ============================================================
   3. Comparação real: a mesma produção em cada mês com preço oficial
   ============================================================ */

export type LinhaComparacao = {
  ano: number;
  mes: number;
  rotulo: string;
  /** null quando não há preço oficial nem hipótese para projetar o mês */
  origem: OrigemValor | null;
  /** R$/t usado no cálculo */
  preco: number | null;
  /** toneladas × preco */
  valor: number | null;
  /** R$ de diferença contra o mês real de moagem */
  diferencaValor: number | null;
  /** % de diferença contra o preço do mês real */
  variacaoPct: number | null;
  /** true na linha do mês em que a moagem realmente aconteceu */
  ehMoagemReal: boolean;
};

export type ComparacaoProducao = {
  toneladas: number;
  mesReal: { ano: number; mes: number };
  rotuloReal: string;
  /** Preço oficial do mês real, quando cadastrado */
  precoMesReal: number | null;
  /** Valor oficial da produção no mês real, quando há preço */
  valorMesReal: number | null;
  linhas: LinhaComparacao[];
  /** Meses com algum valor (oficial ou projetado) */
  mesesComValor: number;
};

export type OpcoesComparacao = {
  /** Meses projetados à frente do último preço oficial (0 = não projeta) */
  mesesProjecao?: number;
  /** Janela da média móvel usada como hipótese de projeção */
  mesesMedia?: number;
};

const LIMITE_MESES = 240;

/**
 * Produção escolhida para avaliação nos meses.
 *
 * `modelo`/`agio` são opcionais: quando enviados, a comparação reaproveita a
 * mesma regra financeira de `calcularColheita` em vez de inventar outra.
 */
export type ProducaoAvaliada = {
  toneladas: number;
  ano: number;
  mes: number;
  modelo?: string;
  agio?: number;
};

/**
 * Regra da usina, igual à de `calcularColheita`:
 * Pindorama paga (preço + ágio) por tonelada; Coruripe e os demais usam o
 * preço de referência do mês.
 */
function valorDoMes(preco: number, toneladas: number, modelo?: string, agio?: number): number {
  if (modelo === "pindorama") return toneladas * (preco + (agio ?? 0));
  return preco * toneladas;
}

/**
 * Dada uma produção real (toneladas + mês da moagem), mostra quanto ela
 * valeria em cada mês que tem preço oficial cadastrado.
 *
 * Meses posteriores ao último preço oficial entram como PROJEÇÃO usando a
 * média móvel — são estimativas, não valores oficiais.
 */
export function compararProducaoNosMeses(
  producao: ProducaoAvaliada,
  precos: PrecoMes[],
  opcoes: OpcoesComparacao = {},
): ComparacaoProducao {
  const toneladas = Math.max(producao.toneladas, 0);
  const ordenados = ordenar(precos);
  // Projetar é opt-in: sem pedido explícito a comparação mostra só o histórico.
  const mesesProjecao = Math.max(0, Math.min(opcoes.mesesProjecao ?? 0, 24));
  const media = mediaMovel(ordenados, opcoes.mesesMedia ?? 6);

  const mesReal = { ano: producao.ano, mes: producao.mes };
  const chaveReal = chave(mesReal.ano, mesReal.mes);
  const chavePrimeiro = ordenados[0] ? chave(ordenados[0].ano, ordenados[0].mes) : chaveReal;
  const chaveUltimo = ordenados.at(-1)
    ? chave(ordenados.at(-1)!.ano, ordenados.at(-1)!.mes)
    : chaveReal;

  const inicio = Math.min(chavePrimeiro, chaveReal);
  const fim = Math.max(chaveUltimo + mesesProjecao, chaveReal);

  const precoMesReal = obterPreco(ordenados, mesReal.ano, mesReal.mes) ?? null;
  const valorMesReal =
    precoMesReal === null
      ? null
      : valorDoMes(precoMesReal, toneladas, producao.modelo, producao.agio);

  const linhas: LinhaComparacao[] = [];
  for (let k = inicio; k <= fim && linhas.length < LIMITE_MESES; k++) {
    const ano = Math.floor(k / 12);
    const mes = (k % 12) + 1;
    const oficial = obterPreco(ordenados, ano, mes);

    // Só o que está depois do último preço oficial pode ser projetado.
    const projetavel = oficial === undefined && media > 0 && k > chaveUltimo;
    const preco = oficial ?? (projetavel ? media : null);

    const ehMoagemReal = k === chaveReal;
    const valor =
      preco === null ? null : valorDoMes(preco, toneladas, producao.modelo, producao.agio);

    linhas.push({
      ano,
      mes,
      rotulo: rotulo(ano, mes),
      origem: preco === null ? null : projetavel ? "projecao" : "real",
      preco,
      valor,
      diferencaValor:
        valor !== null && valorMesReal !== null ? valor - valorMesReal : null,
      variacaoPct:
        valor !== null && valorMesReal !== null && valorMesReal !== 0
          ? ((valor - valorMesReal) / valorMesReal) * 100
          : null,
      ehMoagemReal,
    });
  }

  return {
    toneladas,
    mesReal,
    rotuloReal: rotulo(mesReal.ano, mesReal.mes),
    precoMesReal,
    valorMesReal,
    linhas,
    mesesComValor: linhas.filter((l) => l.valor !== null).length,
  };
}

/** Mês de maior e de menor valor estimado — base dos destaques da aba 1. */
export function extremosComparacao(comparacao: ComparacaoProducao): {
  maior: LinhaComparacao | null;
  menor: LinhaComparacao | null;
} {
  const comValor = comparacao.linhas.filter((l): l is LinhaComparacao & { valor: number } => l.valor !== null);
  if (comValor.length === 0) return { maior: null, menor: null };
  return {
    maior: comValor.reduce((a, b) => (b.valor > a.valor ? b : a)),
    menor: comValor.reduce((a, b) => (b.valor < a.valor ? b : a)),
  };
}

/* ============================================================
   4. Agrupamento por fazenda / mês de moagem
   ============================================================ */

export type GrupoMes = {
  id: string;
  fazendaId: string;
  fazendaNome: string;
  ano: number;
  mes: number;
  rotulo: string;
  toneladas: number;
  qtdColheitas: number;
  /** R$ de custo somado do grupo (base do custo por tonelada) */
  custoTotal: number;
  /** R$/t ponderado pelas toneladas do grupo */
  custoPorTonelada: number;
};

/** Soma as colheitas da mesma fazenda no mesmo mês de moagem. */
export function agruparProducaoPorMes(colheitas: ColheitaReal[]): GrupoMes[] {
  const porChave = new Map<string, GrupoMes>();

  for (const c of colheitas) {
    const toneladas = Math.max(c.toneladas, 0);
    const custo = c.custoPorTonelada * toneladas;
    const id = `${c.fazendaId}|${c.anoMoagem}|${c.mesMoagem}`;
    const atual = porChave.get(id);

    if (atual) {
      atual.toneladas += toneladas;
      atual.qtdColheitas += 1;
      atual.custoTotal += custo;
    } else {
      porChave.set(id, {
        id,
        fazendaId: c.fazendaId,
        fazendaNome: c.fazendaNome,
        ano: c.anoMoagem,
        mes: c.mesMoagem,
        rotulo: rotulo(c.anoMoagem, c.mesMoagem),
        toneladas,
        qtdColheitas: 1,
        custoTotal: custo,
        custoPorTonelada: c.custoPorTonelada,
      });
    }
  }

  return [...porChave.values()]
    .map((g) => ({ ...g, custoPorTonelada: g.toneladas > 0 ? g.custoTotal / g.toneladas : 0 }))
    .sort((a, b) => chave(a.ano, a.mes) - chave(b.ano, b.mes));
}

/* ============================================================
   5. Filtros
   ============================================================ */

export function filtrarColheitas(
  colheitas: ColheitaReal[],
  filtro: FiltroComparacao,
): ColheitaReal[] {
  const { de, ate } = filtro.periodo ?? {};
  const inicio = de ? chave(de.ano, de.mes) : null;
  const fim = ate ? chave(ate.ano, ate.mes) : null;

  return colheitas.filter((c) => {
    if (filtro.safra !== undefined && c.safra !== filtro.safra) return false;
    if (filtro.fazendaId && c.fazendaId !== filtro.fazendaId) return false;
    if (filtro.usinaId && c.usinaId !== filtro.usinaId) return false;
    const k = chave(c.anoMoagem, c.mesMoagem);
    if (inicio !== null && k < inicio) return false;
    if (fim !== null && k > fim) return false;
    return true;
  });
}

/* ============================================================
   6. Aba 2 — Cenário de preço (hipotético)
   ============================================================ */

export type CenarioPreco = {
  /** R$/t informado pelo usuário */
  preco: number;
  toneladas: number;
  /** R$/t de custo, quando conhecido — 0 deixa o custo fora do resultado */
  custoPorTonelada: number;
  origem: OrigemValor;
};

export type ResultadoCenario = {
  preco: number;
  toneladas: number;
  /** R$ de receita bruta da produção */
  receita: number;
  /** R$ de custo total quando há custo por tonelada informado */
  custoTotal: number | null;
  /** R$ de valor líquido (receita − custo) */
  valorLiquido: number | null;
  origem: OrigemValor;
};

export function simularCenarioPreco(cenario: CenarioPreco): ResultadoCenario {
  const preco = Math.max(cenario.preco, 0);
  const toneladas = Math.max(cenario.toneladas, 0);
  const receita = preco * toneladas;
  const temCusto = cenario.custoPorTonelada > 0;
  const custoTotal = temCusto ? cenario.custoPorTonelada * toneladas : null;
  return {
    preco,
    toneladas,
    receita,
    custoTotal,
    valorLiquido: custoTotal === null ? null : receita - custoTotal,
    origem: cenario.origem,
  };
}

/**
 * Preço-base sugerido: último preço oficial cadastrado; sem histórico,
 * cai para a média móvel do próprio histórico; sem nenhum registro, 0.
 */
export function precoBaseSugerido(precos: PrecoMes[], mesesMedia = 6): number {
  const ordenados = ordenar(precos);
  const ultimo = ordenados.at(-1);
  if (ultimo) return ultimo.precoMedio;
  return mediaMovel(ordenados, mesesMedia);
}

/* ============================================================
   7. Aba 3 — Alta e baixa (−20% a +20%)
   ============================================================ */

export const VARIACOES_PADRAO = [-20, -15, -10, -5, 0, 5, 10, 15, 20] as const;
export type VariacaoPct = (typeof VARIACOES_PADRAO)[number];

export type LinhaVariacao = {
  variacaoPct: number;
  rotulo: string;
  preco: number;
  toneladas: number;
  receita: number;
  /** R$ contra o cenário base (0%) */
  diferencaValor: number;
  valorLiquido: number | null;
  /** true na variação 0%, que reproduz o preço base informado */
  ehBase: boolean;
  origem: OrigemValor;
};

/**
 * Aplica as variações ao preço base. Variação 0% é o próprio preço base
 * (REAL quando o base veio do histórico, SIMULAÇÃO quando foi digitado);
 * as demais são hipóteses do usuário.
 */
export function gerarVariacoesPreco(
  precoBase: number,
  toneladas: number,
  opcoes: { custoPorTonelada?: number; variacoes?: readonly number[] } = {},
): LinhaVariacao[] {
  const base = Math.max(precoBase, 0);
  const ton = Math.max(toneladas, 0);
  const custo = opcoes.custoPorTonelada ?? 0;
  const receitaBase = base * ton;

  return (opcoes.variacoes ?? VARIACOES_PADRAO).map((variacaoPct) => {
    const preco = Math.round(base * (1 + variacaoPct / 100) * 100) / 100;
    const receita = preco * ton;
    return {
      variacaoPct,
      rotulo: variacaoPct > 0 ? `+${variacaoPct}%` : `${variacaoPct}%`,
      preco,
      toneladas: ton,
      receita,
      diferencaValor: receita - receitaBase,
      valorLiquido: custo > 0 ? receita - custo * ton : null,
      ehBase: variacaoPct === 0,
      origem: variacaoPct === 0 ? "real" : "simulacao",
    };
  });
}

/** Variação em que a receita iguala o custo total, se o custo existir. */
export function variacaoDeEquilibrio(
  precoBase: number,
  toneladas: number,
  custoPorTonelada: number,
): number | null {
  if (custoPorTonelada <= 0 || toneladas <= 0 || precoBase <= 0) return null;
  return ((custoPorTonelada - precoBase) / precoBase) * 100;
}

/* ============================================================
   8. Séries prontas para os gráficos
   ============================================================ */

/**
 * Gráfico 1 — evolução do preço por mês. Os valores oficiais e os projetados
 * vão em séries separadas para que a linha tracejada não finja ser oficial.
 */
export function seriePrecoMensal(comparacao: ComparacaoProducao): {
  rotulo: string;
  preco: number | null;
  precoOficial: number | null;
  precoProjetado: number | null;
  ehMoagemReal: boolean;
}[] {
  return comparacao.linhas.map((l) => ({
    rotulo: l.rotulo,
    preco: l.preco,
    precoOficial: l.origem === "real" ? l.preco : null,
    precoProjetado: l.origem === "projecao" ? l.preco : null,
    ehMoagemReal: l.ehMoagemReal,
  }));
}

/**
 * Gráfico 2 — valor da produção por mês: as mesmas toneladas avaliadas pelo
 * preço de cada mês, com o mês real de moagem destacado na barra.
 */
export function serieValorProducao(
  comparacao: ComparacaoProducao,
): { rotulo: string; valor: number | null; origem: OrigemValor | null; ehMoagemReal: boolean }[] {
  return comparacao.linhas.map((l) => ({
    rotulo: l.rotulo,
    valor: l.valor,
    origem: l.origem,
    ehMoagemReal: l.ehMoagemReal,
  }));
}

/** Gráfico 3 — alta/baixa sobre o preço base. */
export function serieVariacoes(linhas: LinhaVariacao[]): {
  rotulo: string;
  receita: number;
  diferencaValor: number;
  ehBase: boolean;
}[] {
  return linhas.map((l) => ({
    rotulo: l.rotulo,
    receita: l.receita,
    diferencaValor: l.diferencaValor,
    ehBase: l.ehBase,
  }));
}

/* ============================================================
   8b. ATR x preço — qualidade da cana vs remuneração do mês
   ============================================================ */

export type PontoAtrPreco = {
  ano: number;
  mes: number;
  rotulo: string;
  /** kg ATR/t do mês; null quando não registrado (a linha fica vazia). */
  atr: number | null;
  /** R$/t oficial do mês. */
  preco: number | null;
  /** R$/kg ATR do mês; null quando não registrado. */
  precoKgAtr: number | null;
  ehMoagemReal: boolean;
};

/**
 * Série para o gráfico ATR x preço. Meses sem ATR ficam com `atr = null` em
 * vez de 0 — a linha tracejada não pode fingir que a qualidade caiu a zero.
 */
export function serieAtrPreco(
  precos: PrecoMes[],
  ref?: { ano: number; mes: number },
): PontoAtrPreco[] {
  return ordenar(precos).map((p) => ({
    ano: p.ano,
    mes: p.mes,
    rotulo: rotulo(p.ano, p.mes),
    atr: p.atrPorTonelada ?? null,
    preco: p.precoMedio,
    precoKgAtr: p.precoKgAtr ?? null,
    ehMoagemReal: ref ? p.ano === ref.ano && p.mes === ref.mes : false,
  }));
}

export type ResumoAtrPreco = {
  mesesComAtr: number;
  /** Variação % do ATR entre o primeiro e o último mês com ATR. */
  variacaoAtr: number | null;
  /** Variação % do preço na mesma janela, para comparar com o ATR. */
  variacaoPreco: number | null;
  /** Meses em que ATR e preço andaram em sentidos opostos. */
  mesesContrarios: number;
};

const pct = (de: number | null | undefined, atual: number | null | undefined): number | null => {
  if (de == null || atual == null || !Number.isFinite(de) || de <= 0) return null;
  return ((atual - de) / de) * 100;
};

/**
 * Diferença entre ATR e preço: quanto cada um andou no período em que há ATR
 * registrado e em quantos meses os dois se moveram em sentidos opostos.
 */
export function compararAtrPreco(precos: PrecoMes[]): ResumoAtrPreco {
  const serie = serieAtrPreco(precos);
  const comAtr = serie.filter((p) => p.atr !== null);
  if (comAtr.length === 0) {
    return { mesesComAtr: 0, variacaoAtr: null, variacaoPreco: null, mesesContrarios: 0 };
  }

  const primeira = comAtr[0];
  const ultima = comAtr[comAtr.length - 1];
  const noMesmoPonto = serie.find((p) => p.ano === ultima.ano && p.mes === ultima.mes);

  let mesesContrarios = 0;
  for (let i = 1; i < comAtr.length; i++) {
    const a = comAtr[i - 1];
    const b = comAtr[i];
    const dAtr = (b.atr ?? 0) - (a.atr ?? 0);
    const dPreco = (b.preco ?? 0) - (a.preco ?? 0);
    if (dAtr !== 0 && dPreco !== 0 && Math.sign(dAtr) !== Math.sign(dPreco)) mesesContrarios++;
  }

  return {
    mesesComAtr: comAtr.length,
    variacaoAtr: pct(primeira.atr, ultima.atr),
    variacaoPreco: pct(primeira.preco, noMesmoPonto?.preco),
    mesesContrarios,
  };
}

/* ============================================================
   9. Opções de filtro vindas do servidor
   ============================================================ */

export type OpcoesComparacaoFiltros = {
  safras: string[];
  fazendas: { id: string; nome: string }[];
  usinas: { id: string; nome: string }[];
};

export function opcoesDe(colheitas: ColheitaReal[]): OpcoesComparacaoFiltros {
  return {
    safras: [...new Set(colheitas.map((c) => c.safra).filter((s): s is string => Boolean(s)))].sort(),
    fazendas: [...new Map(colheitas.map((c) => [c.fazendaId, { id: c.fazendaId, nome: c.fazendaNome }])).values()].sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR"),
    ),
    usinas: [...new Map(colheitas.map((c) => [c.usinaId, { id: c.usinaId, nome: c.usinaNome }])).values()].sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR"),
    ),
  };
}