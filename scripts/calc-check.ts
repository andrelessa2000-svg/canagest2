import { calcularColheita, sacosAduboTarefa } from "@/lib/colheita";
import { parseDecimal } from "@/lib/format";

function checar(nome: string, obtido: number, esperado: number, tol = 0.01) {
  if (Math.abs(obtido - esperado) > tol) {
    throw new Error(
      `${nome}: esperado ${esperado.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}, obtido ${obtido.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}`,
    );
  }
  console.log(`OK  ${nome} = ${obtido.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}`);
}

// Exemplo real Pindorama: 2300 t · R$164 + ágio R$15 => R$ 411.700
const pindorama = calcularColheita({
  modelo: "pindorama",
  tipo: "soca",
  toneladas: 2300,
  precoCana: 164,
  agio: 15,
  ctc: 12000,
});
checar("Pindorama receita", pindorama.receita, 411700);
checar("Pindorama receita/t", pindorama.receitaPorTonelada, 179);
checar("Pindorama CTC", pindorama.ctc, 12000);
checar("Pindorama lucro", pindorama.lucro, 399700);

// Arrendamento: 38 t/tarefa × R$164 × 100 tarefas = R$ 623.200
const arrendamento = calcularColheita({
  modelo: "pindorama",
  tipo: "soca",
  toneladas: 2300,
  precoCana: 164,
  agio: 0,
  arrendar: true,
  tonsPorTarefa: 38,
  tarefasArrendadas: 100,
});
checar("Arrendamento", arrendamento.arrendamento, 623200);

// Adubo soca: 3 sacos × 50 kg × 100 tarefas × (R$ 2.500/1000) = R$ 37.500
const adubo = calcularColheita({
  modelo: "pindorama",
  tipo: "soca",
  toneladas: 2300,
  precoCana: 164,
  agio: 0,
  adubo: true,
  precoTonAdubo: 2500,
  tarefasAdubo: 100,
});
checar("Adubo soca", adubo.adubo, 37500);
checar("Sacos/tarefa soca", sacosAduboTarefa("soca"), 3);

// Adubo planta: 4 sacos → R$ 50.000
const aduboPlanta = calcularColheita({
  modelo: "pindorama",
  tipo: "planta",
  toneladas: 2300,
  precoCana: 164,
  agio: 0,
  adubo: true,
  precoTonAdubo: 2500,
  tarefasAdubo: 100,
});
checar("Adubo planta", aduboPlanta.adubo, 50000);
checar("Sacos/tarefa planta", sacosAduboTarefa("planta"), 4);

// Herbicida: soma dos itens da calda
const herbicida = calcularColheita({
  modelo: "pindorama",
  tipo: "soca",
  toneladas: 2300,
  precoCana: 164,
  agio: 0,
herbicidas: [
    { nome: "Glifosato", valor: 750.5 },
    { nome: "Diurana", valor: 249.5 },
  ],
});
checar("Herbicida calda", herbicida.herbicida, 1000);

// Despesas usina
const despesas = calcularColheita({
  modelo: "pindorama",
  tipo: "soca",
  toneladas: 2300,
  precoCana: 164,
  agio: 0,
  despesasUsina: [{ nome: "Biológico", valor: 400 }],
});
checar("Despesas usina", despesas.despesasUsina, 400);

// Outros insumos (calcário, pó de rocha, biológico, vinhaça...)
const insumos = calcularColheita({
  modelo: "pindorama",
  tipo: "soca",
  toneladas: 2300,
  precoCana: 164,
  agio: 0,
  ctc: 1000,
  adubo: true,
  precoTonAdubo: 2500,
  tarefasAdubo: 100,
  herbicidas: [{ nome: "Glifosato", valor: 500 }],
  insumos: [
    { nome: "Calcário", valor: 1500 },
    { nome: "Vinhaça", valor: 300 },
  ],
});
checar("Outros insumos", insumos.insumos, 1800);
checar("Total insumos (adubo+herbicida+outros)", insumos.totalInsumos, 37500 + 500 + 1800);
checar("Total despesas (insumos+ctc)", insumos.totalDespesas, 37500 + 500 + 1800 + 1000);

// Coruripe: 500 t × 125,496 ATR/t = 62.748 kg ATR; × R$1,0852
const coruripe = calcularColheita({
  modelo: "coruripe",
  tipo: "soca",
  toneladas: 500,
  atrPorTonelada: 125.496,
  precoKgAtr: 1.0852,
  ctc: 3000,
});
checar("Coruripe ATR total", coruripe.atrTotal, 62748);
checar("Coruripe receita", coruripe.receita, 62748 * 1.0852, 0.5);
checar("Coruripe lucro", coruripe.lucro, 62748 * 1.0852 - 3000, 0.5);

const zerado = calcularColheita({ modelo: "pindorama", toneladas: 0 });
checar("Por tonelada com 0 t", zerado.receitaPorTonelada, 0);
checar("Lucro por tonelada com 0 t", zerado.lucroPorTonelada, 0);

// Parse de números com formato brasileiro
checar("parse '2300'", parseDecimal("2300"), 2300);
checar("parse '2.300'", parseDecimal("2.300"), 2300);
checar("parse '2.300,5'", parseDecimal("2.300,5"), 2300.5);
checar("parse '166.000'", parseDecimal("166.000"), 166000);
checar("parse '1.234.567'", parseDecimal("1.234.567"), 1234567);
checar("parse '125,496'", parseDecimal("125,496"), 125.496);
checar("parse '2,5'", parseDecimal("2,5"), 2.5);
checar("parse '149,67467'", parseDecimal("149,67467"), 149.67467);
checar("parse '2.5'", parseDecimal("2.5"), 2.5);

console.log("\nCálculos conferem.");