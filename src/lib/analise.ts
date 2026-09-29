import { fracoesDoRegistro, type RegistroRateio, type TalhaoBase } from "./rateio";

/** Agregação de custos e produção por talhão. Módulo puro (testável). */

export type TalhaoNomeado = TalhaoBase & { nome: string };

export type Agregado = {
  talhaoId: string;
  talhaoNome: string;
  fazendaNome: string;
  areaHa: number;
  plantio: number;
  tratos: number;
  colheitaCusto: number;
  toneladas: number;
  haColhidos: number;
  receita: number;
};

type RegistroComValor = RegistroRateio & { fazendaId: string; valor: number };
export type ColheitaCalculada = RegistroRateio & {
  fazendaId: string;
  toneladas: number;
  areaHa: number;
  receita: number;
  despesas: number;
};

export function agregarPorTalhao(entrada: {
  talhoes: TalhaoNomeado[];
  nomeFazenda: Map<string, string>;
  plantios: RegistroComValor[];
  tratos: RegistroComValor[];
  colheitas: ColheitaCalculada[];
  /** Quando informado, só esse talhão aparece (o rateio continua sobre o registro inteiro). */
  talhaoFiltro?: string;
}): Agregado[] {
  const { talhoes, nomeFazenda, talhaoFiltro } = entrada;
  const porId = new Map(talhoes.map((t) => [t.id, t]));
  const mapa = new Map<string, Agregado>();

  const obter = (talhaoId: string): Agregado | null => {
    const t = porId.get(talhaoId);
    if (!t) return null;
    let ag = mapa.get(talhaoId);
    if (!ag) {
      ag = {
        talhaoId,
        talhaoNome: t.nome,
        fazendaNome: nomeFazenda.get(t.fazendaId) ?? "",
        areaHa: t.areaHa,
        plantio: 0,
        tratos: 0,
        colheitaCusto: 0,
        toneladas: 0,
        haColhidos: 0,
        receita: 0,
      };
      mapa.set(talhaoId, ag);
    }
    return ag;
  };

  const distribuir = (
    r: RegistroRateio,
    fazendaId: string,
    aplicar: (ag: Agregado, fracao: number) => void,
  ) => {
    for (const { talhaoId, fracao } of fracoesDoRegistro(r, fazendaId, talhoes)) {
      if (talhaoFiltro && talhaoId !== talhaoFiltro) continue;
      const ag = obter(talhaoId);
      if (ag) aplicar(ag, fracao);
    }
  };

  for (const p of entrada.plantios) {
    distribuir(p, p.fazendaId, (ag, f) => {
      ag.plantio += p.valor * f;
    });
  }
  for (const t of entrada.tratos) {
    distribuir(t, t.fazendaId, (ag, f) => {
      ag.tratos += t.valor * f;
    });
  }
  for (const c of entrada.colheitas) {
    distribuir(c, c.fazendaId, (ag, f) => {
      ag.colheitaCusto += c.despesas * f;
      ag.toneladas += c.toneladas * f;
      ag.haColhidos += c.areaHa * f;
      ag.receita += c.receita * f;
    });
  }

  return [...mapa.values()].sort(
    (a, b) => a.fazendaNome.localeCompare(b.fazendaNome) || a.talhaoNome.localeCompare(b.talhaoNome),
  );
}
