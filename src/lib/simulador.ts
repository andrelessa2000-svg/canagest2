import { TAREFAS_POR_HA } from "@/lib/format";

export type MediasHistoricas = {
  custoPlantioPorTarefa: number;
  custoTratosPorTarefa: number;
  custoColheitaPorTarefa: number;
  custoTotalPorTarefa: number;
  custoTotalPorHa: number;
  produtividadeMedia: number;
  toneladasTotais: number;
  areaTotalHa: number;
  qtdPlantios: number;
  qtdTratos: number;
  qtdColheitas: number;
};

export type CenarioSimulacao = {
  id: string;
  nome: string;
  areaHa: number;
  custoTarefa: number;
  tPorHa: number;
  precoCana: number;
};

export type ResultadoSimulacao = {
  cenario: CenarioSimulacao;
  areaHa: number;
  custoTarefa: number;
  custoHa: number;
  tPorHa: number;
  precoCana: number;
  toneladas: number;
  custoTotal: number;
  receita: number;
  lucro: number;
  roi: number;
  lucroPorHa: number;
  custoPlantio: number;
  custoTratos: number;
  custoColheita: number;
};

export function simularCenarios(cenarios: CenarioSimulacao[], medias: MediasHistoricas): ResultadoSimulacao[] {
  return cenarios.map((c) => {
    const area = c.areaHa;
    const custoT = c.custoTarefa;
    const custoH = custoT * TAREFAS_POR_HA;
    const tHa = c.tPorHa;
    const preco = c.precoCana;
    const toneladas = area * tHa;
    const custoTotal = area * custoH;
    const receita = toneladas * preco;
    const lucro = receita - custoTotal;
    const roi = custoTotal > 0 ? (lucro / custoTotal) * 100 : 0;
    const lucroPorHa = area > 0 ? lucro / area : 0;

    const totalMedio = (medias.custoPlantioPorTarefa + medias.custoTratosPorTarefa + medias.custoColheitaPorTarefa) || 1;
    const propPlantio = medias.custoPlantioPorTarefa / totalMedio;
    const propTratos = medias.custoTratosPorTarefa / totalMedio;
    const propColheita = medias.custoColheitaPorTarefa / totalMedio;

    return {
      cenario: c,
      areaHa: area,
      custoTarefa: custoT,
      custoHa: custoH,
      tPorHa: tHa,
      precoCana: preco,
      toneladas,
      custoTotal,
      receita,
      lucro,
      roi,
      lucroPorHa,
      custoPlantio: custoTotal * propPlantio,
      custoTratos: custoTotal * propTratos,
      custoColheita: custoTotal * propColheita,
    };
  });
}