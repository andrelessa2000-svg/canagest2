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

export type EntradaCalculo = {
  modelo: ModeloUsina | string;
  tipo?: TipoCorte | string;
  toneladas: number;

  precoCana?: number | null;
  agio?: number | null;
  atrPorTonelada?: number | null;
  precoKgAtr?: number | null;

  ctc?: number;

  areaColhida?: number | null;
  arrendar?: boolean;
  tonsPorTarefa?: number | null;
  tarefasArrendadas?: number | null;

  adubo?: boolean;
  precoTonAdubo?: number | null;
  sacosPorTarefa?: number;
  tarefasAdubo?: number;

  herbicidas?: ItemDespesa[];
  insumos?: ItemDespesa[];
  despesasUsina?: ItemDespesa[];
};

export type ResultadoColheita = {
  toneladas: number;
  atrTotal: number;
  receita: number;
  ctc: number;
  arrendamento: number;
  adubo: number;
  herbicida: number;
  insumos: number;
  despesasUsina: number;
  totalInsumos: number;
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

export function sacosAduboTarefa(tipo: string | undefined): number {
  return SACOS_ADUBO_POR_TAREFA[(tipo as TipoCorte) ?? "soca"] ?? 3;
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

  const areaBase = n(e.areaColhida) > 0 ? n(e.areaColhida) : n(e.tarefasAdubo);

  const arrendamento =
    e.arrendar && n(e.tonsPorTarefa) > 0 && n(e.tarefasArrendadas) > 0
      ? n(e.tonsPorTarefa) * n(e.precoCana) * n(e.tarefasArrendadas)
      : 0;

  const sacos = e.sacosPorTarefa ?? sacosAduboTarefa(e.tipo);
  const tarefasAdubo = n(e.tarefasAdubo) > 0 ? n(e.tarefasAdubo) : areaBase;
  const adubo =
    e.adubo && n(e.precoTonAdubo) > 0 && tarefasAdubo > 0
      ? sacos * 50 * tarefasAdubo * (n(e.precoTonAdubo) / 1000)
      : 0;

  const herbicida = soma(e.herbicidas);
  const insumos = soma(e.insumos);
  const totalInsumos = adubo + herbicida + insumos;
  const despesasUsina = soma(e.despesasUsina);

  const totalDespesas = ctc + arrendamento + totalInsumos + despesasUsina;
  const lucro = receita - totalDespesas;

  return {
    toneladas,
    atrTotal,
    receita,
    ctc,
    arrendamento,
    adubo,
    herbicida,
    insumos,
    despesasUsina,
    totalInsumos,
    totalDespesas,
    lucro,
    receitaPorTonelada: toneladas > 0 ? receita / toneladas : 0,
    custoPorTonelada: toneladas > 0 ? totalDespesas / toneladas : 0,
    lucroPorTonelada: toneladas > 0 ? lucro / toneladas : 0,
  };
}