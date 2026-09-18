export const MODELOS_USINA = ["pindorama", "coruripe"] as const;
export type ModeloUsina = (typeof MODELOS_USINA)[number];

export const MODELO_USINA_LABEL: Record<ModeloUsina, string> = {
  pindorama: "Pindorama",
  coruripe: "Coruripe",
};

export const COMPLEMENTO_TIPOS = ["por_tonelada", "total"] as const;
export type ComplementoTipo = (typeof COMPLEMENTO_TIPOS)[number];

export const COMPLEMENTO_TIPO_LABEL: Record<ComplementoTipo, string> = {
  por_tonelada: "R$ por tonelada",
  total: "Valor total (R$)",
};

export type DespesasColheita = {
  despCorte: number;
  despTransporte: number;
  despOutrasColheita: number;
  despPlantioUsina: number;
  despArrendamento: number;
  despAdubacao: number;
  despHerbicida: number;
  despOutras: number;
};

export const DESPESAS: { campo: keyof DespesasColheita; rotulo: string }[] = [
  { campo: "despCorte", rotulo: "Corte" },
  { campo: "despTransporte", rotulo: "Transporte" },
  { campo: "despOutrasColheita", rotulo: "Outras despesas de colheita" },
  { campo: "despPlantioUsina", rotulo: "Plantio com a usina" },
  { campo: "despArrendamento", rotulo: "Arrendamento" },
  { campo: "despAdubacao", rotulo: "Adubação" },
  { campo: "despHerbicida", rotulo: "Herbicida" },
  { campo: "despOutras", rotulo: "Outras despesas" },
];

export type EntradaCalculo = Partial<DespesasColheita> & {
  modelo: ModeloUsina | string;
  toneladas: number;
  valorTonelada?: number | null;
  complemento?: number | null;
  complementoTipo?: string | null;
  atrPorTonelada?: number | null;
  precoKgAtr?: number | null;
  outrosAdicionais?: number | null;
};

export type ResultadoColheita = {
  toneladas: number;
  atrTotal: number;
  valorBase: number;
  valorComplemento: number;
  valorOutrosAdicionais: number;
  valorBruto: number;
  totalDespesas: number;
  lucro: number;
  receitaPorTonelada: number;
  custoPorTonelada: number;
  lucroPorTonelada: number;
};

function n(v: number | null | undefined): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export function calcularColheita(e: EntradaCalculo): ResultadoColheita {
  const toneladas = n(e.toneladas);

  let atrTotal = 0;
  let valorBase = 0;
  let valorComplemento = 0;
  let valorOutrosAdicionais = 0;

  if (e.modelo === "coruripe") {
    atrTotal = toneladas * n(e.atrPorTonelada);
    const precoKgAtr = n(e.precoKgAtr);
    valorBase =
      precoKgAtr > 0 ? atrTotal * precoKgAtr : toneladas * n(e.valorTonelada);
    valorComplemento = n(e.complemento);
    valorOutrosAdicionais = n(e.outrosAdicionais);
  } else {
    valorBase = toneladas * n(e.valorTonelada);
    const complemento = n(e.complemento);
    valorComplemento =
      e.complementoTipo === "por_tonelada" ? toneladas * complemento : complemento;
  }

  const valorBruto = valorBase + valorComplemento + valorOutrosAdicionais;

  const totalDespesas =
    n(e.despCorte) +
    n(e.despTransporte) +
    n(e.despOutrasColheita) +
    n(e.despPlantioUsina) +
    n(e.despArrendamento) +
    n(e.despAdubacao) +
    n(e.despHerbicida) +
    n(e.despOutras);

  const lucro = valorBruto - totalDespesas;

  return {
    toneladas,
    atrTotal,
    valorBase,
    valorComplemento,
    valorOutrosAdicionais,
    valorBruto,
    totalDespesas,
    lucro,
    receitaPorTonelada: toneladas > 0 ? valorBruto / toneladas : 0,
    custoPorTonelada: toneladas > 0 ? totalDespesas / toneladas : 0,
    lucroPorTonelada: toneladas > 0 ? lucro / toneladas : 0,
  };
}
