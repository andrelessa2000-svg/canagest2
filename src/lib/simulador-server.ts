"use server";

import { prisma } from "@/lib/db";
import { userIdAtual } from "@/lib/auth";
import { calcularColheita } from "@/lib/colheita";
import { TAREFAS_POR_HA } from "@/lib/format";
import { MediasHistoricas } from "./simulador";

export async function getMediasHistoricas(fazendaId?: string): Promise<MediasHistoricas> {
  const userId = await userIdAtual();

  const whereBase = { userId, ...(fazendaId ? { fazendaId } : {}) };

  const [plantios, tratos, colheitas] = await Promise.all([
    prisma.plantio.findMany({
      where: { ...whereBase, projecao: false },
      select: { valor: true, tarefas: true, areaHa: true },
    }),
    prisma.trato.findMany({
      where: { ...whereBase, projecao: false },
      select: { valor: true, tarefas: true },
    }),
    prisma.colheita.findMany({
      where: { ...whereBase, projecao: false },
      include: {
        usina: { select: { modelo: true } },
        fazenda: { select: { talhoes: { select: { areaHa: true } } } },
      },
    }),
  ]);

  const plantiosComTarefas = plantios.filter((p) => (p.tarefas ?? 0) > 0);
  const custoPlantioPorTarefa =
    plantiosComTarefas.length > 0
      ? plantiosComTarefas.reduce((s, p) => s + p.valor / (p.tarefas ?? 1), 0) / plantiosComTarefas.length
      : 0;

  const tratosComTarefas = tratos.filter((t) => (t.tarefas ?? 0) > 0);
  const custoTratosPorTarefa =
    tratosComTarefas.length > 0
      ? tratosComTarefas.reduce((s, t) => s + t.valor / (t.tarefas ?? 1), 0) / tratosComTarefas.length
      : 0;

  let custoColheitaPorTarefa = 0;
  let colheitasComTarefas = 0;

  for (const c of colheitas) {
    const areaTarefas = c.areaColhida ?? (c.fazenda?.talhoes?.reduce((a: number, t: { areaHa: number }) => a + t.areaHa, 0) ?? 0) * 3.3058;
    if (areaTarefas > 0) {
      const r = calcularColheita({
        modelo: c.usina.modelo,
        tipo: c.tipo,
        toneladas: c.toneladas,
        precoCana: c.precoCana ?? undefined,
        agio: c.agio ?? undefined,
        atrPorTonelada: c.atrPorTonelada ?? undefined,
        precoKgAtr: c.precoKgAtr ?? undefined,
        ctc: c.ctc ?? undefined,
        areaColhida: areaTarefas,
        arrendar: c.arrendar ?? false,
        tonsPorTarefa: c.tonsPorTarefa ?? undefined,
        tarefasArrendadas: c.tarefasArrendadas ?? undefined,
        adubo: c.adubo ?? false,
        precoTonAdubo: c.precoTonAdubo ?? undefined,
        tarefasAdubo: c.tarefasAdubo ?? undefined,
        herbicidas: (c.herbicidas ?? []) as { nome: string; valor: number }[],
        insumos: (c.insumos ?? []) as { nome: string; valor: number }[],
        despesasUsina: (c.despesasUsina ?? []) as { nome: string; valor: number }[],
      });
      custoColheitaPorTarefa += r.totalDespesas / areaTarefas;
      colheitasComTarefas++;
    }
  }
  if (colheitasComTarefas > 0) custoColheitaPorTarefa /= colheitasComTarefas;

  const colheitasComArea = colheitas.filter(
    (c) => c.toneladas > 0 && (c.areaColhida ?? (c.fazenda?.talhoes?.reduce((a: number, t: { areaHa: number }) => a + t.areaHa, 0) ?? 0)) > 0
  );
  let produtividadeMedia = 0;
  if (colheitasComArea.length > 0) {
    const areaTotalHa = colheitasComArea.reduce((s: number, c: { areaColhida?: number | null; fazenda?: { talhoes?: { areaHa: number }[] | null } }) => {
      const areaHa = c.areaColhida ?? (c.fazenda?.talhoes?.reduce((a: number, t: { areaHa: number }) => a + t.areaHa, 0) ?? 0);
      return s + areaHa;
    }, 0);
    const toneladasTotal = colheitasComArea.reduce((s, c) => s + c.toneladas, 0);
    produtividadeMedia = areaTotalHa > 0 ? toneladasTotal / areaTotalHa : 0;
  }

  const custoTotalPorTarefa = custoPlantioPorTarefa + custoTratosPorTarefa + custoColheitaPorTarefa;
  const custoTotalPorHa = custoTotalPorTarefa * 3.3058;

  return {
    custoPlantioPorTarefa: Math.round(custoPlantioPorTarefa * 100) / 100,
    custoTratosPorTarefa: Math.round(custoTratosPorTarefa * 100) / 100,
    custoColheitaPorTarefa: Math.round(custoColheitaPorTarefa * 100) / 100,
    custoTotalPorTarefa: Math.round(custoTotalPorTarefa * 100) / 100,
    custoTotalPorHa: Math.round(custoTotalPorHa * 100) / 100,
    produtividadeMedia: Math.round(produtividadeMedia * 10) / 10,
    toneladasTotais: colheitas.reduce((s, c) => s + c.toneladas, 0),
    areaTotalHa: 0,
    qtdPlantios: plantios.length,
    qtdTratos: tratos.length,
    qtdColheitas: colheitas.length,
  };
}