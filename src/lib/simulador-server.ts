import { prisma } from "@/lib/db";
import { userIdAtual } from "@/lib/auth";
import { calcularColheita, type ItemDespesa } from "@/lib/colheita";
import { TAREFAS_POR_HA } from "@/lib/format";
import { areaColhidaHa, areaRegistroHa } from "@/lib/rateio";
import {
  calcularMedias,
  type ColheitaMedia,
  type MediasHistoricas,
  type PlantioMedia,
  type TratoMedia,
} from "@/lib/simulador";

/** Médias reais do usuário (somente registros do caderno de campo, sem projeções). */
export async function getMediasHistoricas(): Promise<MediasHistoricas> {
  const userId = await userIdAtual();

  const [talhoes, plantios, tratos, colheitas] = await Promise.all([
    prisma.talhao.findMany({
      where: { userId },
      select: { id: true, fazendaId: true, areaHa: true },
    }),
    prisma.plantio.findMany({
      where: { userId, projecao: false },
      select: {
        fazendaId: true,
        valor: true,
        tarefas: true,
        areaHa: true,
        escopo: true,
        talhoesIds: true,
      },
    }),
    prisma.trato.findMany({
      where: { userId, projecao: false },
      select: { valor: true },
    }),
    prisma.colheita.findMany({
      where: { userId, projecao: false },
      include: { usina: { select: { modelo: true } } },
    }),
  ]);

  const colheitasMedia: ColheitaMedia[] = colheitas.map((c) => {
    const areaHa = areaColhidaHa(c, c.fazendaId, talhoes);
    const r = calcularColheita({
      modelo: c.usina.modelo,
      tipo: c.tipo,
      toneladas: c.toneladas,
      precoCana: c.precoCana,
      agio: c.agio,
      atrPorTonelada: c.atrPorTonelada,
      precoKgAtr: c.precoKgAtr,
      ctc: c.ctc,
      areaColhida: areaHa * TAREFAS_POR_HA,
      arrendar: c.arrendar,
      tonsPorTarefa: c.tonsPorTarefa,
      tarefasArrendadas: c.tarefasArrendadas,
      adubo: c.adubo,
      precoTonAdubo: c.precoTonAdubo,
      tarefasAdubo: c.tarefasAdubo ?? areaHa * TAREFAS_POR_HA,
      herbicidas: (c.herbicidas ?? []) as ItemDespesa[],
      insumos: (c.insumos ?? []) as ItemDespesa[],
      despesasUsina: (c.despesasUsina ?? []) as ItemDespesa[],
    });
    return {
      tipo: c.tipo,
      toneladas: c.toneladas,
      areaHa,
      receita: r.receita,
      despesas: r.totalDespesas,
    };
  });

  const plantiosMedia: PlantioMedia[] = plantios.map((p) => ({
    valor: p.valor,
    areaHa: areaRegistroHa(p, p.fazendaId, talhoes),
  }));

  const tratosMedia: TratoMedia[] = tratos.map((t) => ({ valor: t.valor }));

  return calcularMedias(colheitasMedia, plantiosMedia, tratosMedia);
}
