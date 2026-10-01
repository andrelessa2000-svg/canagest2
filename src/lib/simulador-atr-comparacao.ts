/**
 * Comparativo de ATR — o que a cana colhida teria rendido em outro mês.
 *
 * Módulo puro (sem banco, sem React) para poder ser testado.
 *
 * Como funciona
 * ------------
 * A usina anuncia, mês a mês, quanto paga por kg de ATR (`precoKgAtr`, R$/kg).
 * Esse é o número que muda: quando ela baixa, todo mundo da mesma safra recebe
 * menos. O valor bruto que o produtor já recebeu continua sendo o número
 * verdadeiro; aqui ele é reavaliado pela proporção do ATR de cada mês:
 *
 *     valor_no_mês_X = valor_recebido × (ATR_X ÷ ATR_do_mês_real)
 *
 * Isso dispensa cadastrar a qualidade da cana (kg ATR/t) de cada fazenda: a
 * tonelagem e a qualidade da cana já colhida estão contidas no valor bruto
 * pago, e a proporção do ATR é a mesma para todo mundo.
 *
 * Duas leituras, que nunca se misturam:
 * - REAL     meses em que a usina já anunciou o ATR;
 * - SIMULAÇÃO o mês seguinte, com ATR que o usuário especula.
 */

import { MESES, deslocarMes } from "./historico-preco";

/* ============================================================
   1. Entradas
   ============================================================ */

/** Mês com ATR anunciado pela usina. */
export type MesAtr = {
  ano: number;
  mes: number; // 1-12
  /** R$ por kg de ATR anunciado no mês */
  precoKgAtr: number;
};

/** Colheita real com o valor bruto que o produtor recebeu. */
export type ColheitaComReceita = {
  id: string;
  fazendaId: string;
  fazendaNome: string;
  usinaId: string;
  usinaNome: string;
  safra: string | null;
  anoMoagem: number;
  mesMoagem: number;
  toneladas: number;
  /** R$ de receita bruta que a colheita realmente rendeu */
  receitaBruta: number;
};

/* ============================================================
   2. Utilidades
   ============================================================ */

function chave(ano: number, mes: number): number {
  return ano * 12 + (mes - 1);
}

/** Só os meses com ATR utilizável, do mais antigo ao mais recente. */
export function mesesComAtr(meses: MesAtr[]): MesAtr[] {
  return [...meses]
    .filter((m) => Number.isFinite(m.precoKgAtr) && m.precoKgAtr > 0)
    .sort((a, b) => chave(a.ano, a.mes) - chave(b.ano, b.mes));
}

export function rotuloMes(ano: number, mes: number): string {
  return `${MESES[mes - 1] ?? "?"}/${String(ano).slice(2)}`;
}

export function acharAtr(meses: MesAtr[], ano: number, mes: number): number | null {
  const alvo = mesesComAtr(meses).find((m) => m.ano === ano && m.mes === mes);
  return alvo ? alvo.precoKgAtr : null;
}

/** Valor do mesmo volume reavaliado no ATR de outro mês. */
export function valorNoMes(receitaReal: number, atrReal: number, atrMes: number): number {
  if (!Number.isFinite(atrReal) || atrReal <= 0) return 0;
  return receitaReal * (atrMes / atrReal);
}

/* ============================================================
   3. Mês simulado: sempre o seguinte ao último ATR anunciado
   ============================================================ */

export type MesReferencia = { ano: number; mes: number; rotulo: string };

/** Último mês com ATR anunciado pela usina. */
export function ultimoMesAtr(meses: MesAtr[]): MesAtr | null {
  const ordenados = mesesComAtr(meses);
  return ordenados.length > 0 ? ordenados[ordenados.length - 1] : null;
}

/**
 * Mês que ainda não saiu: sempre o seguinte ao último mês com ATR. É o que o
 * produtor especula — com ago/set cadastrados, simula outubro.
 */
export function proximoMesAtr(meses: MesAtr[]): MesReferencia | null {
  const ultimo = ultimoMesAtr(meses);
  if (!ultimo) return null;
  const { ano, mes } = deslocarMes(ultimo.ano, ultimo.mes, 1);
  return { ano, mes, rotulo: rotuloMes(ano, mes) };
}

/* ============================================================
   4. Agrupamento: uma linha por fazenda e mês em que ela moeu
   ============================================================ */

export type GrupoMoinada = {
  id: string;
  fazendaId: string;
  fazendaNome: string;
  usinaId: string;
  usinaNome: string;
  ano: number;
  mes: number;
  rotulo: string;
  toneladas: number;
  qtdColheitas: number;
  /** R$ de valor bruto realmente recebido no mês */
  receitaReal: number;
};

/**
 * Soma as colheitas da mesma fazenda no mesmo mês de moagem. Uma fazenda
 * colhida em dois meses vira dois grupos: cada moagem se compara com os ATRs
 * a partir do mês em que realmente aconteceu.
 */
export function agruparPorMoinada(colheitas: ColheitaComReceita[]): GrupoMoinada[] {
  const porChave = new Map<string, GrupoMoinada>();

  for (const c of colheitas) {
    const toneladas = Math.max(c.toneladas, 0);
    const receita = Number.isFinite(c.receitaBruta) ? c.receitaBruta : 0;
    const id = `${c.fazendaId}|${c.anoMoagem}|${c.mesMoagem}`;
    const atual = porChave.get(id);

    if (atual) {
      atual.toneladas += toneladas;
      atual.receitaReal += receita;
      atual.qtdColheitas += 1;
    } else {
      porChave.set(id, {
        id,
        fazendaId: c.fazendaId,
        fazendaNome: c.fazendaNome,
        usinaId: c.usinaId,
        usinaNome: c.usinaNome,
        ano: c.anoMoagem,
        mes: c.mesMoagem,
        rotulo: rotuloMes(c.anoMoagem, c.mesMoagem),
        toneladas,
        qtdColheitas: 1,
        receitaReal: receita,
      });
    }
  }

  return [...porChave.values()].sort(
    (a, b) => chave(a.ano, a.mes) - chave(b.ano, b.mes) || a.fazendaNome.localeCompare(b.fazendaNome, "pt-BR"),
  );
}

/* ============================================================
   5. Comparativo real
   ============================================================ */

export type LinhaAtr = {
  ano: number;
  mes: number;
  rotulo: string;
  /** R$/kg de ATR anunciado no mês */
  atr: number;
  /** R$ do mesmo volume reavaliado neste ATR */
  valor: number;
  /** R$ contra o que foi realmente recebido (0 no mês real) */
  diferenca: number;
  /** true no mês em que a moagem realmente aconteceu */
  ehReal: boolean;
};

export type ComparacaoReal = {
  grupo: GrupoMoinada;
  /** true quando a usina não anunciou o ATR do mês em que a fazenda moeu */
  semAtrNoMesReal: boolean;
  linhas: LinhaAtr[];
  /** melhor mês cadastrado, em R$ */
  melhor: LinhaAtr | null;
  /** pior mês cadastrado, em R$ */
  pior: LinhaAtr | null;
  /** R$ que a moagem deixou de receber em relação ao melhor mês (>= 0) */
  perdaVsMelhor: number;
};

/**
 * Uma moagem reavaliada por cada ATR real cadastrado. A linha do mês real
 * reproduz exatamente o valor bruto recebido; as demais mostram o mesmo
 * volume pago pelo ATR de cada mês.
 */
export function compararAtrReal(grupo: GrupoMoinada, meses: MesAtr[]): ComparacaoReal {
  const ordenados = mesesComAtr(meses);
  const atrReal = acharAtr(ordenados, grupo.ano, grupo.mes);
  const semAtrNoMesReal = atrReal === null || atrReal <= 0;

  const linhas: LinhaAtr[] = ordenados.map((m) => {
    const valor = semAtrNoMesReal ? 0 : valorNoMes(grupo.receitaReal, atrReal as number, m.precoKgAtr);
    return {
      ano: m.ano,
      mes: m.mes,
      rotulo: rotuloMes(m.ano, m.mes),
      atr: m.precoKgAtr,
      valor,
      diferenca: semAtrNoMesReal ? 0 : valor - grupo.receitaReal,
      ehReal: m.ano === grupo.ano && m.mes === grupo.mes,
    };
  });

  // Sem o ATR do mês real os valores são todos zero: não há melhor nem pior.
  const comValor = semAtrNoMesReal ? [] : linhas;
  const maior = comValor.length > 0 ? comValor.reduce((a, b) => (b.valor > a.valor ? b : a)) : null;
  const menor = comValor.length > 0 ? comValor.reduce((a, b) => (b.valor < a.valor ? b : a)) : null;

  return {
    grupo,
    semAtrNoMesReal,
    linhas,
    melhor: maior,
    pior: menor,
    perdaVsMelhor: maior ? Math.max(maior.valor - grupo.receitaReal, 0) : 0,
  };
}

/* ============================================================
   6. Simulação do próximo mês
   ============================================================ */

export type LinhaPrevisao = {
  grupo: GrupoMoinada;
  mesReal: string;
  toneladas: number;
  /** R$ realmente recebido */
  receitaReal: number;
  /** R$ se o próximo mês fechar no ATR digitado */
  receitaPrevista: number;
  /** R$ de diferença (previsto − real); negativo = perda */
  diferenca: number;
  perda: boolean;
};

export type Previsao = {
  /** mês simulado: sempre o seguinte ao último ATR cadastrado */
  mes: MesReferencia | null;
  /** R$/kg de ATR digitado pelo usuário */
  atrSimulado: number;
  linhas: LinhaPrevisao[];
  /** R$ de impacto somando todas as fazendas da lista */
  totalDiferenca: number;
  /** quantas fazendas ficaram de fora por falta do ATR do mês real */
  semBase: number;
};

/**
 * Impacto de um ATR especulado no próximo mês sobre as fazendas já
 * colhidas. Fazenda sem o ATR do mês em que moeu fica de fora — sem a base
 * não há proporção possível.
 */
export function simularProximoMes(grupos: GrupoMoinada[], meses: MesAtr[], atrSimulado: number): Previsao {
  const alvo = proximoMesAtr(meses);
  const ordenados = mesesComAtr(meses);
  const linhas: LinhaPrevisao[] = [];
  let totalDiferenca = 0;
  let semBase = 0;

  if (alvo === null) return { mes: null, atrSimulado, linhas, totalDiferenca: 0, semBase: 0 };

  for (const g of grupos) {
    const atrReal = acharAtr(ordenados, g.ano, g.mes);
    if (atrReal === null || atrReal <= 0) {
      semBase++;
      continue;
    }

    const receitaPrevista = valorNoMes(g.receitaReal, atrReal, atrSimulado);
    const diferenca = receitaPrevista - g.receitaReal;
    totalDiferenca += diferenca;

    linhas.push({
      grupo: g,
      mesReal: g.rotulo,
      toneladas: g.toneladas,
      receitaReal: g.receitaReal,
      receitaPrevista,
      diferenca,
      perda: diferenca < 0,
    });
  }

  // Pior efeito primeiro: é o que o produtor precisa ver.
  linhas.sort((a, b) => a.diferenca - b.diferenca);

  return { mes: alvo, atrSimulado, linhas, totalDiferenca, semBase };
}

/* ============================================================
   7. Séries para os gráficos
   ============================================================ */

/**
 * Gráfico do comparativo real: para cada ATR cadastrado, o valor de toda a
 * produção reavaliada naquele ATR. O mês que teve moagem real é destacado.
 */
export function serieAtrComparativo(
  grupos: GrupoMoinada[],
  meses: MesAtr[],
): { rotulo: string; atr: number; valor: number; ehReal: boolean }[] {
  const ordenados = mesesComAtr(meses);
  const totalPorMes = new Map<number, number>();

  for (const g of grupos) {
    const atrReal = acharAtr(ordenados, g.ano, g.mes);
    if (atrReal === null || atrReal <= 0) continue;
    for (const m of ordenados) {
      const k = chave(m.ano, m.mes);
      totalPorMes.set(k, (totalPorMes.get(k) ?? 0) + valorNoMes(g.receitaReal, atrReal, m.precoKgAtr));
    }
  }

  return ordenados.map((m) => ({
    rotulo: rotuloMes(m.ano, m.mes),
    atr: m.precoKgAtr,
    valor: totalPorMes.get(chave(m.ano, m.mes)) ?? 0,
    ehReal: grupos.some((g) => g.ano === m.ano && g.mes === m.mes),
  }));
}

/** Série simples do ATR anunciado mês a mês — base do eixo do gráfico. */
export function serieAtrMensal(meses: MesAtr[]): { rotulo: string; atr: number }[] {
  return mesesComAtr(meses).map((m) => ({ rotulo: rotuloMes(m.ano, m.mes), atr: m.precoKgAtr }));
}
