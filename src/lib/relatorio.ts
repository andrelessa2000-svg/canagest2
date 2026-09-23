import { prisma } from "./db";
import { calcularColheita, type ItemDespesa } from "./colheita";

export type FilaCascata = {
  fazendaId: string;
  fazendaNome: string;
  toneladas: number;
  tarefas: number;
  receita: number;
  ctc: number;
  arrendamento: number;
  insumos: number;
  despesasUsina: number;
  lucroBruto: number;
  tratos: number;
  lucroNeto: number;
  plantio: number;
};

export type Cascata = {
  filas: FilaCascata[];
  total: FilaCascata;
};

export async function cargarCascata(): Promise<Cascata> {
  const [colheitas, tratos, plantios] = await Promise.all([
    prisma.colheita.findMany({
      include: {
        fazenda: {
          select: { id: true, nome: true, talhoes: { select: { areaHa: true } } },
        },
        usina: { select: { nome: true, modelo: true } },
      },
    }),
    prisma.trato.findMany({
      select: { fazendaId: true, valor: true },
    }),
    prisma.plantio.findMany({
      select: { fazendaId: true, valor: true },
    }),
  ]);

  const tratosPorFazenda = new Map<string, number>();
  for (const t of tratos) {
    tratosPorFazenda.set(t.fazendaId, (tratosPorFazenda.get(t.fazendaId) ?? 0) + t.valor);
  }

  const plantioPorFazenda = new Map<string, number>();
  for (const p of plantios) {
    plantioPorFazenda.set(p.fazendaId, (plantioPorFazenda.get(p.fazendaId) ?? 0) + p.valor);
  }

  const mapa = new Map<string, FilaCascata>();

  for (const c of colheitas) {
    const areaFazendaHa = c.fazenda.talhoes.reduce((a, t) => a + t.areaHa, 0);
    const areaTarefas = c.areaColhida ?? areaFazendaHa * 3.3;
    const r = calcularColheita({
      modelo: c.usina.modelo,
      tipo: c.tipo,
      toneladas: c.toneladas,
      precoCana: c.precoCana,
      agio: c.agio,
      atrPorTonelada: c.atrPorTonelada,
      precoKgAtr: c.precoKgAtr,
      ctc: c.ctc,
      areaColhida: areaTarefas,
      arrendar: c.arrendar,
      tonsPorTarefa: c.tonsPorTarefa,
      tarefasArrendadas: c.tarefasArrendadas,
      adubo: c.adubo,
      precoTonAdubo: c.precoTonAdubo,
      tarefasAdubo: c.tarefasAdubo ?? areaTarefas,
      herbicidas: (c.herbicidas ?? []) as ItemDespesa[],
      insumos: (c.insumos ?? []) as ItemDespesa[],
      despesasUsina: (c.despesasUsina ?? []) as ItemDespesa[],
    });

    const fila = mapa.get(c.fazendaId) ?? {
      fazendaId: c.fazenda.id,
      fazendaNome: c.fazenda.nome,
      toneladas: 0,
      tarefas: 0,
      receita: 0,
      ctc: 0,
      arrendamento: 0,
      insumos: 0,
      despesasUsina: 0,
      lucroBruto: 0,
      tratos: 0,
      lucroNeto: 0,
      plantio: 0,
    };
    fila.toneladas += r.toneladas;
    fila.tarefas += areaTarefas;
    fila.receita += r.receita;
    fila.ctc += r.ctc;
    fila.arrendamento += r.arrendamento;
    fila.insumos += r.totalInsumos;
    fila.despesasUsina += r.despesasUsina;
    mapa.set(c.fazendaId, fila);
  }

  const filas = [...mapa.values()].map((f) => {
    f.tratos = tratosPorFazenda.get(f.fazendaId) ?? 0;
    f.plantio = plantioPorFazenda.get(f.fazendaId) ?? 0;
    f.lucroBruto =
      f.receita - f.ctc - f.arrendamento - f.insumos - f.despesasUsina;
    f.lucroNeto = f.lucroBruto - f.tratos;
    return f;
  });

  const vacio = (nome: string): FilaCascata => ({
    fazendaId: "",
    fazendaNome: nome,
    toneladas: 0,
    tarefas: 0,
    receita: 0,
    ctc: 0,
    arrendamento: 0,
    insumos: 0,
    despesasUsina: 0,
    lucroBruto: 0,
    tratos: 0,
    lucroNeto: 0,
    plantio: 0,
  });

  const total = filas.reduce(
    (acc, f) => ({
      fazendaId: "",
      fazendaNome: "TOTAL",
      toneladas: acc.toneladas + f.toneladas,
      tarefas: acc.tarefas + f.tarefas,
      receita: acc.receita + f.receita,
      ctc: acc.ctc + f.ctc,
      arrendamento: acc.arrendamento + f.arrendamento,
      insumos: acc.insumos + f.insumos,
      despesasUsina: acc.despesasUsina + f.despesasUsina,
      lucroBruto: acc.lucroBruto + f.lucroBruto,
      tratos: acc.tratos + f.tratos,
      lucroNeto: acc.lucroNeto + f.lucroNeto,
      plantio: acc.plantio + f.plantio,
    }),
    vacio("TOTAL"),
  );

  return { filas, total };
}

export function filaCascataCSV(f: FilaCascata): string {
  const num = (v: number) =>
    v.toLocaleString("pt-BR", { maximumFractionDigits: 2 }).replace(".", ",");
  return [
    `"${f.fazendaNome}"`,
    num(f.toneladas),
    num(f.tarefas),
    num(f.receita),
    num(f.ctc),
    num(f.arrendamento),
    num(f.insumos),
    num(f.despesasUsina),
    num(f.lucroBruto),
    num(f.tratos),
    num(f.lucroNeto),
    num(f.plantio),
  ].join(";");
}