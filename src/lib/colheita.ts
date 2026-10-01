export const MODELOS_USINA = ["pindorama", "coruripe"] as const;
export type ModeloUsina = (typeof MODELOS_USINA)[number];

export const MODELO_USINA_LABEL: Record<ModeloUsina, string> = {
  pindorama: "Pindorama",
  coruripe: "Coruripe",
};

export const TIPOS_CORTE = ["planta", "soca", "ressoca"] as const;
export type TipoCorte = (typeof TIPOS_CORTE)[number];

export const TIPOS_CORTE_LABEL: Record<TipoCorte, string> = {
  planta: "Cana planta",
  soca: "Soca",
  ressoca: "Ressoca",
};

export const SACOS_ADUBO_POR_TAREFA: Record<TipoCorte, number> = {
  planta: 4,
  soca: 3,
  ressoca: 3,
};

export type ItemDespesa = { nome: string; valor: number };

/** Dívida como gravada no banco: [{ talhaoId?, nome, quantidade, unidade, valorUnitario, valorTotal }] */
export type DividaGravada = {
  talhaoId?: string | null;
  nome?: string;
  valorUnitario?: number;
  valorTotal?: number;
};

/** Converte as dívidas gravadas em Itens de despesa, tolerando o formato antigo { nome, valor }. */
export function lerDividas(bruto: unknown): ItemDespesa[] {
  if (!Array.isArray(bruto)) return [];
  return bruto.flatMap((d): ItemDespesa[] => {
    if (!d || typeof d !== "object") return [];
    const it = d as DividaGravada;
    const valor = typeof it.valorTotal === "number" ? it.valorTotal : 0;
    return [{ nome: it.nome ?? "", valor: Number.isFinite(valor) ? valor : 0 }];
  });
}

export type EntradaCalculo = {
  modelo: ModeloUsina | string;
  tipo?: TipoCorte | string;
  toneladas: number;

  precoCana?: number | null;
  agio?: number | null;
  atrPorTonelada?: number | null;
  precoKgAtr?: number | null;

  // 1. CTC informado pela usina
  ctc?: number | null;

  // 2. Arrendamento — calculado sobre o preço BRUTO da cana
  arrendar?: boolean;
  tonsPorTarefa?: number | null;
  tarefasArrendadas?: number | null;

  // 3. Dívidas com usina ou terceiros: plantio, operações, semente
  dividas?: ItemDespesa[];
};

export type ResultadoColheita = {
  toneladas: number;
  atrTotal: number;
  receita: number;
  ctc: number;
  arrendamento: number;
  dividas: number;
  totalDespesas: number;
  lucro: number;
  receitaPorTonelada: number;
  custoPorTonelada: number;
  lucroPorTonelada: number;
};

function n(v: number | null | undefined): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function soma(itens: ItemDespesa[] | undefined): number {
  return (itens ?? []).reduce((acc, i) => acc + n(i.valor), 0);
}

export function calcularColheita(e: EntradaCalculo): ResultadoColheita {
  const toneladas = n(e.toneladas);

  let atrTotal = 0;
  let receita = 0;

  if (e.modelo === "coruripe") {
    atrTotal = toneladas * n(e.atrPorTonelada);
    const precoKgAtr = n(e.precoKgAtr);
    receita =
      precoKgAtr > 0 ? atrTotal * precoKgAtr : toneladas * n(e.precoCana);
  } else {
    receita = toneladas * (n(e.precoCana) + n(e.agio));
  }

  const ctc = n(e.ctc);

  // Arrendamento incide sobre o preço BRUTO da cana: nunca sobre ágio nem sobre ATR.
  const arrendamento =
    e.arrendar && n(e.tonsPorTarefa) > 0 && n(e.tarefasArrendadas) > 0
      ? n(e.tonsPorTarefa) * n(e.precoCana) * n(e.tarefasArrendadas)
      : 0;

  const dividas = soma(e.dividas);

  const totalDespesas = ctc + arrendamento + dividas;
  const lucro = receita - totalDespesas;

  return {
    toneladas,
    atrTotal,
    receita,
    ctc,
    arrendamento,
    dividas,
    totalDespesas,
    lucro,
    receitaPorTonelada: toneladas > 0 ? receita / toneladas : 0,
    custoPorTonelada: toneladas > 0 ? totalDespesas / toneladas : 0,
    lucroPorTonelada: toneladas > 0 ? lucro / toneladas : 0,
  };
}