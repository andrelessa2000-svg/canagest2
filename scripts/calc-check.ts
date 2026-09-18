import { calcularColheita } from "@/lib/colheita";

function perto(a: number, b: number, tol = 0.01): boolean {
  return Math.abs(a - b) <= tol;
}

function checar(nome: string, obtido: number, esperado: number, tol = 0.01) {
  if (!perto(obtido, esperado, tol)) {
    throw new Error(
      `${nome}: esperado ${esperado.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}, obtido ${obtido.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}`,
    );
  }
  console.log(`OK  ${nome} = ${obtido.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}`);
}

const pindorama = calcularColheita({
  modelo: "pindorama",
  toneladas: 2360.4,
  valorTonelada: 149.67467,
  complemento: 34328.39,
  complementoTipo: "total",
  despCorte: 1000,
  despTransporte: 500,
});

checar("Pindorama valor base", pindorama.valorBase, 353292.09);
checar("Pindorama complemento", pindorama.valorComplemento, 34328.39);
checar("Pindorama bruto", pindorama.valorBruto, 387620.48);
checar("Pindorama despesas", pindorama.totalDespesas, 1500);
checar("Pindorama lucro", pindorama.lucro, 386120.48);

const porTonelada = calcularColheita({
  modelo: "pindorama",
  toneladas: 100,
  valorTonelada: 150,
  complemento: 4.5,
  complementoTipo: "por_tonelada",
});
checar("Pindorama complemento por tonelada", porTonelada.valorComplemento, 450);
checar("Pindorama bruto por tonelada", porTonelada.valorBruto, 15450);

const coruripe = calcularColheita({
  modelo: "coruripe",
  toneladas: 500,
  atrPorTonelada: 125.496,
  precoKgAtr: 1.0852,
  complemento: 1000,
  outrosAdicionais: 250,
});
checar("Coruripe ATR total", coruripe.atrTotal, 62748);
checar(
  "Coruripe valor base",
  coruripe.valorBase,
  62748 * 1.0852,
  0.5,
);
checar(
  "Coruripe bruto",
  coruripe.valorBruto,
  62748 * 1.0852 + 1250,
  0.5,
);

const coruripeFallback = calcularColheita({
  modelo: "coruripe",
  toneladas: 500,
  atrPorTonelada: 125.496,
  precoKgAtr: 0,
  valorTonelada: 149.67467,
});
checar(
  "Coruripe fallback valor base",
  coruripeFallback.valorBase,
  500 * 149.67467,
);

const zerado = calcularColheita({ modelo: "pindorama", toneladas: 0 });
checar("Por tonelada com 0 t", zerado.receitaPorTonelada, 0);
checar("Lucro por tonelada com 0 t", zerado.lucroPorTonelada, 0);

console.log("\nCálculos conferem.");
