import { TAREFAS_POR_HA } from "./format";

/**
 * Rateio de registros (plantio, trato, colheita) entre talhões.
 * Módulo puro: sem acesso a banco, testável isoladamente.
 */

export type TalhaoBase = { id: string; fazendaId: string; areaHa: number };
export type Fracao = { talhaoId: string; fracao: number };

export type RegistroRateio = {
  talhaoId?: string | null;
  talhoesIds?: unknown;
  alocacoes?: unknown;
  talhoesColhidos?: unknown;
};

type Peso = { talhaoId: string; peso: number };

function ehObjeto(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object";
}

function normalizar(pesos: Peso[]): Fracao[] {
  const somados = new Map<string, number>();
  for (const p of pesos) {
    if (!p.talhaoId) continue;
    somados.set(p.talhaoId, (somados.get(p.talhaoId) ?? 0) + Math.max(p.peso, 0));
  }
  const ids = [...somados.keys()];
  if (ids.length === 0) return [];
  const total = [...somados.values()].reduce((s, v) => s + v, 0);
  if (total <= 0) return ids.map((talhaoId) => ({ talhaoId, fracao: 1 / ids.length }));
  return ids.map((talhaoId) => ({ talhaoId, fracao: (somados.get(talhaoId) ?? 0) / total }));
}

/**
 * Distribui 100% do registro entre os talhões que ele atinge.
 * A soma das frações é sempre 1 (ou lista vazia se não há talhão conhecido).
 *
 * Ordem de prioridade:
 *  1. alocacoes (porções: talhão inteiro ou tarefas parciais)
 *  2. talhoesColhidos (colheita: áreas informadas por talhão)
 *  3. talhoesIds
 *  4. talhaoId
 *  5. fazenda inteira, proporcional à área dos talhões
 */
export function fracoesDoRegistro(
  r: RegistroRateio,
  fazendaId: string,
  talhoes: TalhaoBase[],
): Fracao[] {
  const area = new Map(talhoes.map((t) => [t.id, t.areaHa]));

  const alocacoes = Array.isArray(r.alocacoes) ? r.alocacoes : [];
  const pesosAloc: Peso[] = [];
  for (const a of alocacoes) {
    if (!ehObjeto(a) || typeof a.talhaoId !== "string" || !area.has(a.talhaoId)) continue;
    const tarefas = Number(a.tarefas);
    const completo = a.completo === true || a.tarefas === null || a.tarefas === undefined;
    const peso =
      !completo && Number.isFinite(tarefas) && tarefas > 0
        ? tarefas
        : (area.get(a.talhaoId) ?? 0) * TAREFAS_POR_HA;
    pesosAloc.push({ talhaoId: a.talhaoId, peso });
  }
  if (pesosAloc.length > 0) return normalizar(pesosAloc);

  const colhidos = Array.isArray(r.talhoesColhidos) ? r.talhoesColhidos : [];
  const pesosColhidos: Peso[] = [];
  for (const c of colhidos) {
    if (!ehObjeto(c) || typeof c.id !== "string" || !area.has(c.id)) continue;
    const areaInformada = Number(c.areaHa);
    pesosColhidos.push({
      talhaoId: c.id,
      peso: Number.isFinite(areaInformada) && areaInformada > 0 ? areaInformada : (area.get(c.id) ?? 0),
    });
  }
  if (pesosColhidos.length > 0) return normalizar(pesosColhidos);

  const ids = Array.isArray(r.talhoesIds)
    ? (r.talhoesIds as unknown[]).filter((x): x is string => typeof x === "string" && area.has(x))
    : [];
  if (ids.length > 0) return normalizar(ids.map((id) => ({ talhaoId: id, peso: area.get(id) ?? 0 })));

  if (r.talhaoId && area.has(r.talhaoId)) return [{ talhaoId: r.talhaoId, fracao: 1 }];

  return normalizar(
    talhoes
      .filter((t) => t.fazendaId === fazendaId)
      .map((t) => ({ talhaoId: t.id, peso: t.areaHa })),
  );
}

function areaDaFazenda(fazendaId: string, talhoes: TalhaoBase[]): number {
  return talhoes.filter((t) => t.fazendaId === fazendaId).reduce((s, t) => s + t.areaHa, 0);
}

/** Área colhida em hectares. `areaColhida` é gravada em TAREFAS. */
export function areaColhidaHa(
  c: { areaColhida?: number | null; talhoesColhidos?: unknown },
  fazendaId: string,
  talhoes: TalhaoBase[],
): number {
  if (typeof c.areaColhida === "number" && c.areaColhida > 0) {
    return c.areaColhida / TAREFAS_POR_HA;
  }
  const colhidos = Array.isArray(c.talhoesColhidos) ? c.talhoesColhidos : [];
  const soma = colhidos.reduce<number>(
    (s, x) => s + (ehObjeto(x) ? Number(x.areaHa) || 0 : 0),
    0,
  );
  if (soma > 0) return soma;
  return areaDaFazenda(fazendaId, talhoes);
}

/** Área de um plantio/trato em hectares (0 quando não há como saber). */
export function areaRegistroHa(
  r: {
    tarefas?: number | null;
    areaHa?: number | null;
    escopo?: string | null;
    talhoesIds?: unknown;
  },
  fazendaId: string,
  talhoes: TalhaoBase[],
): number {
  if (typeof r.tarefas === "number" && r.tarefas > 0) return r.tarefas / TAREFAS_POR_HA;
  if (typeof r.areaHa === "number" && r.areaHa > 0) return r.areaHa;
  if (r.escopo === "fazenda") return areaDaFazenda(fazendaId, talhoes);
  const ids = Array.isArray(r.talhoesIds) ? (r.talhoesIds as unknown[]) : [];
  const porId = new Map(talhoes.map((t) => [t.id, t.areaHa]));
  return ids.reduce<number>((s, id) => s + (typeof id === "string" ? (porId.get(id) ?? 0) : 0), 0);
}
