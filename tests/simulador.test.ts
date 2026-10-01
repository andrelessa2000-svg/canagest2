import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularMedias, sensibilidade, simular, type Cenario } from "../src/lib/simulador";
import { calcularColheita, lerDividas } from "../src/lib/colheita";

const base: Cenario = {
  id: "1",
  nome: "Teste",
  areaHa: 10,
  produtividade: 80,
  preco: 150,
  custoColheitaHa: 3000,
  custoTratosHa: 2000,
  custoPlantioHa: 10000,
  cortes: 5,
};

const perto = (a: number, b: number) => Math.abs(a - b) < 1e-6;

test("produtividade média é ponderada pela área, não média simples", () => {
  const m = calcularMedias(
    [
      { tipo: "soca", toneladas: 100, areaHa: 10, receita: 15000, despesas: 5000 },
      { tipo: "soca", toneladas: 300, areaHa: 20, receita: 45000, despesas: 12000 },
    ],
    [],
    [],
  );
  assert.ok(perto(m.produtividade, 400 / 30));
  assert.ok(perto(m.precoMedio, 60000 / 400));
  assert.ok(perto(m.custoColheitaHa, 17000 / 30));
  assert.ok(perto(m.produtividadePorTipo.soca, 400 / 30));
});

test("colheita sem área não distorce a produtividade", () => {
  const m = calcularMedias(
    [
      { tipo: "soca", toneladas: 100, areaHa: 10, receita: 0, despesas: 0 },
      { tipo: "soca", toneladas: 500, areaHa: 0, receita: 0, despesas: 0 },
    ],
    [],
    [],
  );
  assert.ok(perto(m.produtividade, 10));
});

test("plantio sem área é ignorado e contado", () => {
  const m = calcularMedias(
    [],
    [
      { valor: 20000, areaHa: 10 },
      { valor: 99999, areaHa: 0 },
    ],
    [],
  );
  assert.ok(perto(m.custoPlantioHa, 2000));
  assert.equal(m.plantiosSemArea, 1);
  assert.equal(m.qtdPlantios, 2);
});

test("sem dados, nada vira NaN nem Infinity", () => {
  const m = calcularMedias([], [], []);
  for (const v of [m.produtividade, m.precoMedio, m.custoColheitaHa, m.custoTratosHa, m.custoPlantioHa]) {
    assert.equal(v, 0);
  }
});

test("plantio é diluído nos cortes", () => {
  const r = simular(base);
  assert.ok(perto(r.custoPlantioPorCorteHa, 2000));
  assert.ok(perto(r.custoHa, 3000 + 2000 + 2000));
  assert.ok(perto(r.receita, 80 * 150 * 10));
  assert.ok(perto(r.lucro, 80 * 150 * 10 - 7000 * 10));
  assert.ok(perto(r.lucroHa, 12000 - 7000));
  assert.ok(perto(r.roi, (50000 / 70000) * 100));
});

test("cortes inválidos viram 1 e o ponto de equilíbrio é coerente", () => {
  const r = simular({ ...base, cortes: 0 });
  assert.ok(perto(r.custoPlantioPorCorteHa, 10000));
  const equilibrio = simular({ ...base, cortes: 0, produtividade: r.produtividadeEquilibrio });
  assert.ok(Math.abs(equilibrio.lucro) < 1e-6);
});

test("área zero não gera divisão por zero", () => {
  const r = simular({ ...base, areaHa: 0, produtividade: 0, preco: 0 });
  for (const v of Object.values(r)) assert.ok(Number.isFinite(v));
});

test("sensibilidade: o centro da matriz é o cenário original", () => {
  const m = sensibilidade(base);
  const centro = m[1][2];
  assert.equal(centro.produtividade, 0);
  assert.equal(centro.preco, 0);
  assert.ok(perto(centro.lucro, simular(base).lucro));
  assert.ok(m[2][4].lucro > m[0][0].lucro);
});

test("modelo Pindorama: receita = toneladas × (preço + ágio) e lucro desconta as despesas", () => {
  const r = calcularColheita({
    modelo: "pindorama",
    toneladas: 100,
    precoCana: 150,
    agio: 10,
    ctc: 1000,
    dividas: [{ nome: "Frete", valor: 500 }],
  });
  assert.equal(r.receita, 16000);
  assert.equal(r.totalDespesas, 1500);
  assert.equal(r.lucro, 14500);
});

test("arrendamento incide sobre o preço bruto, nunca sobre ágio ou ATR", () => {
  const pindorama = calcularColheita({
    modelo: "pindorama",
    toneladas: 1000,
    precoCana: 150,
    agio: 25,
    arrendar: true,
    tonsPorTarefa: 40,
    tarefasArrendadas: 10,
  });
  assert.equal(pindorama.receita, 175000);
  assert.equal(pindorama.arrendamento, 40 * 150 * 10);

  const coruripe = calcularColheita({
    modelo: "coruripe",
    toneladas: 1000,
    atrPorTonelada: 130,
    precoKgAtr: 1.1,
    precoCana: 150,
    arrendar: true,
    tonsPorTarefa: 40,
    tarefasArrendadas: 10,
  });
  assert.equal(coruripe.arrendamento, 40 * 150 * 10);
});

test("dívidas gravadas no formato do banco são somadas pelo valor total", () => {
  const lidas = lerDividas([
    { nome: "Plantio", quantidade: 10, unidade: "t", valorUnitario: 30, valorTotal: 300 },
    { nome: "Semente", quantidade: 5, unidade: "un", valorUnitario: 20, valorTotal: 100 },
  ]);
  const r = calcularColheita({
    modelo: "pindorama",
    toneladas: 100,
    precoCana: 150,
    ctc: 500,
    dividas: lidas,
  });
  assert.equal(r.dividas, 400);
  assert.equal(r.totalDespesas, 900);
});

test("modelo Coruripe: receita pelo ATR quando há preço do kg", () => {
  const r = calcularColheita({
    modelo: "coruripe",
    toneladas: 100,
    atrPorTonelada: 130,
    precoKgAtr: 1,
  });
  assert.equal(r.receita, 13000);
});
