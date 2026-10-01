/**
 * Histórico de preço da cana — módulo puro (sem banco, sem React).
 *
 * Guarda série temporal de preço médio por mês/ano e calcula cenários
 * de decisão: "e se eu tivesse colhido no mês passado?" / "vale a pena esperar?".
 */

export type PrecoMes = {
  ano: number;
  mes: number; // 1-12
  precoMedio: number; // R$/t
  /** kg ATR/t do mês — opcional, registra a qualidade da cana. */
  atrPorTonelada?: number | null;
  /** R$/kg ATR do mês — opcional, complementa a remuneração Coruripe. */
  precoKgAtr?: number | null;
  fonte?: string | null;
};

export const MESES = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
] as const;

export function rotulo(ano: number, mes: number): string {
  return `${MESES[mes - 1] ?? "?"}/${String(ano).slice(2)}`;
}

export function ordenar(serie: PrecoMes[]): PrecoMes[] {
  return [...serie].sort((a, b) => a.ano - b.ano || a.mes - b.mes);
}

export function obterPreco(serie: PrecoMes[], ano: number, mes: number): number | undefined {
  const alvo = serie.find((p) => p.ano === ano && p.mes === mes);
  return alvo ? alvo.precoMedio : undefined;
}

/** Avança/retrocede meses atravessando a virada de ano. */
export function deslocarMes(ano: number, mes: number, delta: number): { ano: number; mes: number } {
  const total = ano * 12 + (mes - 1) + delta;
  return { ano: Math.floor(total / 12), mes: (total % 12) + 1 };
}

export function mesAnterior(ano: number, mes: number): { ano: number; mes: number } {
  return deslocarMes(ano, mes, -1);
}

export function proximoMes(ano: number, mes: number): { ano: number; mes: number } {
  return deslocarMes(ano, mes, 1);
}

/**
 * Só existe comparação de preço entre meses que têm R$/t de verdade.
 * Meses cadastrados apenas com ATR entram como 0 e ficam de fora.
 */
export function temPreco(p: PrecoMes): boolean {
  return Number.isFinite(p.precoMedio) && p.precoMedio > 0;
}

/** Média simples dos últimos N meses que tenham preço cadastrado. */
export function mediaMovel(serie: PrecoMes[], meses: number): number {
  const recentes = ordenar(serie).filter(temPreco).slice(-meses);
  if (recentes.length === 0) return 0;
  return recentes.reduce((s, p) => s + p.precoMedio, 0) / recentes.length;
}

/** Variação percentual entre dois meses. Retorna null se não houver base. */
export function variacao(deAnterior: number, atual: number): number | null {
  if (!Number.isFinite(deAnterior) || deAnterior <= 0) return null;
  if (!Number.isFinite(atual) || atual <= 0) return null;
  return ((atual - deAnterior) / deAnterior) * 100;
}

export type CenarioPreco = {
  /** R$/t usado no cenário */
  preco: number;
  /** R$ de receita bruta das toneladas informadas */
  receita: number;
  /** Diferença de receita contra o cenário de referência (R$) */
  diferenca: number;
  /** De onde veio o preço: mês cadastrado, média ou último conhecido */
  origem: "mes" | "media" | "ultimo";
  rotulo: string;
};

export type ComparacaoCenarios = {
  passado: CenarioPreco | null;
  atual: CenarioPreco | null;
  futuro: CenarioPreco | null;
  /** R$ que o produtor deixou na mesa por não ter colhido no mês passado */
  custoDeEsperar: number;
};

/**
 * Compara a decisão de colheita em três momentos para as toneladas informadas.
 *
 * - `passado`: preço do mês anterior (o que o produtor deixou na mão)
 * - `atual`: preço do mês de referência
 * - `futuro`: preço do mês seguinte; se ainda não existir, usa a média móvel
 *   ou, em último caso, o último preço conhecido como referência de mercado.
 */
export function compararCenarios(
  serie: PrecoMes[],
  ref: { ano: number; mes: number },
  toneladas: number,
  opcoes: { mesesMedia?: number } = {},
): ComparacaoCenarios {
  const mesesMedia = opcoes.mesesMedia ?? 6;
  const ton = Math.max(toneladas, 0);
  const vazio: ComparacaoCenarios = { passado: null, atual: null, futuro: null, custoDeEsperar: 0 };

  const anterior = mesAnterior(ref.ano, ref.mes);
  const seguinte = proximoMes(ref.ano, ref.mes);

  const precoPassado = obterPreco(serie, anterior.ano, anterior.mes);
  const precoAtual = obterPreco(serie, ref.ano, ref.mes);
  const precoFuturoDireto = obterPreco(serie, seguinte.ano, seguinte.mes);
  const media = mediaMovel(serie, mesesMedia);
  const ultimo = ordenar(serie).at(-1)?.precoMedio;

  // Sem nenhum preço nos três meses, não há o que simular.
  if (precoPassado === undefined && precoAtual === undefined && precoFuturoDireto === undefined) {
    return vazio;
  }

  // Referência de comparação: preço atual quando existir, senão o passado.
  const referencia = precoAtual ?? precoPassado ?? precoFuturoDireto ?? 0;

  const montar = (
    preco: number | undefined,
    origem: CenarioPreco["origem"],
    rotuloCenario: string,
  ): CenarioPreco | null => {
    if (preco === undefined || !Number.isFinite(preco)) return null;
    return {
      preco,
      receita: preco * ton,
      diferenca: (preco - referencia) * ton,
      origem,
      rotulo: rotuloCenario,
    };
  };

  const passado = montar(precoPassado, "mes", rotulo(anterior.ano, anterior.mes));
  const atual = montar(precoAtual, "mes", rotulo(ref.ano, ref.mes));

  let futuro: CenarioPreco | null = null;
  if (precoFuturoDireto !== undefined) {
    futuro = montar(precoFuturoDireto, "mes", rotulo(seguinte.ano, seguinte.mes));
  } else if (media > 0) {
    futuro = montar(media, "media", `média ${mesesMedia}m`);
  } else if (ultimo !== undefined) {
    futuro = montar(ultimo, "ultimo", "último preço");
  }

  return {
    passado,
    atual,
    futuro,
    custoDeEsperar: passado ? passado.diferenca : 0,
  };
}

/** Série contínua dos últimos N meses, preenchendo lacunas com null. */
export function serieMensal(
  serie: PrecoMes[],
  meses: number,
  ref: { ano: number; mes: number } = (() => {
    const hoje = new Date();
    return { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 };
  })(),
): { ano: number; mes: number; rotulo: string; preco: number | null }[] {
  const out: { ano: number; mes: number; rotulo: string; preco: number | null }[] = [];
  for (let i = meses - 1; i >= 0; i--) {
    const d = deslocarMes(ref.ano, ref.mes, -i);
    const preco = obterPreco(serie, d.ano, d.mes);
    out.push({ ano: d.ano, mes: d.mes, rotulo: rotulo(d.ano, d.mes), preco: preco ?? null });
  }
  return out;
}
