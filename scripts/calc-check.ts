import { calcularColheita } from "@/lib/colheita";
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

// Arrendamento incide sobre o preço BRUTO: 38 t/tarefa × R$164 × 100 tarefas = R$ 623.200
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

// O ágio NÃO entra no arrendamento: 38 × 179 × 100 continuaria 679.000 se entrasse.
const arrendamentoComAgio = calcularColheita({
  modelo: "pindorama",
  tipo: "soca",
  toneladas: 2300,
  precoCana: 164,
  agio: 15,
  arrendar: true,
  tonsPorTarefa: 38,
  tarefasArrendadas: 100,
});
checar("Arrendamento ignora ágio", arrendamentoComAgio.arrendamento, 623200);

// O ATR também NÃO entra no arrendamento (Coruripe).
const arrendamentoCoruripe = calcularColheita({
  modelo: "coruripe",
  tipo: "soca",
  toneladas: 500,
  atrPorTonelada: 125.496,
  precoKgAtr: 1.0852,
  precoCana: 140,
  arrendar: true,
  tonsPorTarefa: 38,
  tarefasArrendadas: 10,
});
checar("Arrendamento Coruripe usa preço bruto", arrendamentoCoruripe.arrendamento, 38 * 140 * 10);

// Dívidas: soma dos itens de plantio/operações/semente
const dividas = calcularColheita({
  modelo: "pindorama",
  tipo: "soca",
  toneladas: 2300,
  precoCana: 164,
  agio: 0,
  ctc: 1000,
  dividas: [
    { nome: "Plantio", valor: 30000 },
    { nome: "Semente", valor: 7000 },
  ],
});
checar("Dívidas", dividas.dividas, 37000);
checar("Total despesas (CTC+arrendamento+dívidas)", dividas.totalDespesas, 1000 + 37000);
checar("Lucro", dividas.lucro, 2300 * 164 - 1000 - 37000);

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