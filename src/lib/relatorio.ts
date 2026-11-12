import { prisma } from "./db";
import { calcularColheita, lerDividas } from "./colheita";
import { userIdAtual } from "./auth";
import { TAREFAS_POR_HA } from "./format";

export type FilaCascata = {
  fazendaId: string;
  fazendaNome: string;
  toneladas: number;
  tarefas: number;
  receita: number;
  ctc: number;
  arrendamento: number;
  dividas: number;
  lucroBruto: number;
  tratos: number;
  plantio: number;
  proj: number;
  lucroNeto: number;
  lucroNetoEstimado: number;
  toneladasProj: number;
  tarefasProj: number;
  receitaProj: number;
  custosProj: number;
};

export type Cascata = {
  filas: FilaCascata[];
  total: FilaCascata;
};

export async function cargarCascata(): Promise<Cascata> {
  const userId = await userIdAtual();
  const [colheitas, tratos, plantios, investimentos, fazendasEstado] = await Promise.all([
    prisma.colheita.findMany({
      where: { userId },
      include: {
        fazenda: {
          select: { id: true, nome: true, talhoes: { select: { areaHa: true } } },
        },
        usina: { select: { nome: true, modelo: true } },
        custo: true,
      },
    }),
    prisma.trato.findMany({
      where: { userId },
      select: { fazendaId: true, valor: true, projecao: true },
    }),
    prisma.plantio.findMany({
      where: { userId },
      select: { fazendaId: true, valor: true, projecao: true },
    }),
    prisma.investimento.findMany({
      where: { userId },
      select: { fazendaId: true, valor: true },
    }),
    prisma.fazenda.findMany({
      where: { userId },
      select: { id: true, nome: true, ativa: true },
    }),
  ]);

  const nomesFazendas = new Map(fazendasEstado.map((f) => [f.id, f.nome]));
  const fazendasInactivas = new Set(
    fazendasEstado.filter((f) => !f.ativa).map((f) => f.id),
  );

  const sumarPorFazenda = (rows: { fazendaId: string; valor: number }[]) => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.fazendaId, (m.get(r.fazendaId) ?? 0) + r.valor);
    return m;
  };
  const tratosPorFazenda = sumarPorFazenda(tratos.filter((t) => !t.projecao));
  const plantioPorFazenda = sumarPorFazenda(plantios.filter((p) => !p.projecao));
  const projTratos = sumarPorFazenda(
    tratos.filter((t) => t.projecao && !fazendasInactivas.has(t.fazendaId)),
  );
  const projPlantio = sumarPorFazenda(
    plantios.filter((p) => p.projecao && !fazendasInactivas.has(p.fazendaId)),
  );
  const projInvest = sumarPorFazenda(
    investimentos.filter((i) => !fazendasInactivas.has(i.fazendaId)),
  );

  const projPorFazenda = new Map<string, number>();
  for (const [fazendaId, v] of projTratos) projPorFazenda.set(fazendaId, (projPorFazenda.get(fazendaId) ?? 0) + v);
  for (const [fazendaId, v] of projPlantio) projPorFazenda.set(fazendaId, (projPorFazenda.get(fazendaId) ?? 0) + v);
  for (const [fazendaId, v] of projInvest) projPorFazenda.set(fazendaId, (projPorFazenda.get(fazendaId) ?? 0) + v);

  const mapa = new Map<string, FilaCascata>();

  const filaVazia = (fazendaId: string, fazendaNome: string): FilaCascata => ({
    fazendaId,
    fazendaNome,
    toneladas: 0,
    tarefas: 0,
    receita: 0,
    ctc: 0,
    arrendamento: 0,
    dividas: 0,
    lucroBruto: 0,
    tratos: 0,
    plantio: 0,
    proj: 0,
    lucroNeto: 0,
    lucroNetoEstimado: 0,
    toneladasProj: 0,
    tarefasProj: 0,
    receitaProj: 0,
    custosProj: 0,
  });

  for (const c of colheitas) {
    const areaFazendaHa = c.fazenda.talhoes.reduce((a, t) => a + t.areaHa, 0);
    const areaTarefas = c.areaColhida ?? areaFazendaHa * TAREFAS_POR_HA;
    const custo = c.custo;
    const r = calcularColheita({
      modelo: c.usina.modelo,
      tipo: c.tipo,
      toneladas: c.toneladas,
      precoCana: c.precoCana,
      agio: c.agio,
      atrPorTonelada: c.atrPorTonelada,
      precoKgAtr: c.precoKgAtr,
      ctc: custo?.ctc,
      arrendar: custo?.arrendar ?? false,
      tonsPorTarefa: custo?.tonsPorTarefa,
      tarefasArrendadas: custo?.tarefasArrendadas,
      dividas: lerDividas(custo?.dividas),
    });

    if (c.projecao) {
      const pf = mapa.get(c.fazendaId);
      if (pf) {
        pf.toneladasProj += r.toneladas;
        pf.tarefasProj += areaTarefas;
        pf.receitaProj += r.receita;
        pf.custosProj += r.totalDespesas;
      }
      continue;
    }

    const fila = mapa.get(c.fazendaId) ?? filaVazia(c.fazenda.id, c.fazenda.nome);
    fila.toneladas += r.toneladas;
    fila.tarefas += areaTarefas;
    fila.receita += r.receita;
    fila.ctc += r.ctc;
    fila.arrendamento += r.arrendamento;
    fila.dividas += r.dividas;
    mapa.set(c.fazendaId, fila);
  }

  // Fazendas com trato ou plantio real (não projeção) também ganham linha,
  // mesmo sem colheita registrada — o custo aparece e o resultado pode ser negativo.
  for (const fazendaId of new Set([
    ...tratosPorFazenda.keys(),
    ...plantioPorFazenda.keys(),
  ])) {
    if (mapa.has(fazendaId)) continue;
    const nome = nomesFazendas.get(fazendaId);
    if (nome) mapa.set(fazendaId, filaVazia(fazendaId, nome));
  }

  const filas = [...mapa.values()].map((f) => {
    f.tratos = tratosPorFazenda.get(f.fazendaId) ?? 0;
    f.plantio = plantioPorFazenda.get(f.fazendaId) ?? 0;
    f.proj = projPorFazenda.get(f.fazendaId) ?? 0;
    f.lucroBruto = f.receita - f.ctc - f.arrendamento - f.dividas;
    f.lucroNeto = f.lucroBruto - f.tratos - f.plantio;
    f.lucroNetoEstimado = f.lucroNeto - f.proj;
    return f;
  });

  const total = filas.reduce((acc, f) => {
    acc.toneladas += f.toneladas;
    acc.tarefas += f.tarefas;
    acc.receita += f.receita;
    acc.ctc += f.ctc;
    acc.arrendamento += f.arrendamento;
    acc.dividas += f.dividas;
    acc.lucroBruto += f.lucroBruto;
    acc.tratos += f.tratos;
    acc.plantio += f.plantio;
    acc.proj += f.proj;
    acc.lucroNeto += f.lucroNeto;
    acc.lucroNetoEstimado += f.lucroNetoEstimado;
    acc.toneladasProj += f.toneladasProj;
    acc.tarefasProj += f.tarefasProj;
    acc.receitaProj += f.receitaProj;
    acc.custosProj += f.custosProj;
    return acc;
  }, filaVazia("", "TOTAL"));

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
    num(f.dividas),
    num(f.lucroBruto),
    num(f.tratos),
    num(f.plantio),
    num(f.lucroNeto),
    num(f.proj),
    num(f.lucroNetoEstimado),
  ].join(";");
}
