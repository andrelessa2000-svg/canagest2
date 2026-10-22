import { test } from "node:test";
import assert from "node:assert/strict";
import {
  detalhePlantio,
  rankearCenarios,
  simularPlantio,
  type CenarioPlantio,
} from "../src/lib/comparador-plantio";

function base(over: Partial<CenarioPlantio> = {}): CenarioPlantio {
  return {
    id: "c1",
    nome: "Protocolo simples",
    modo: "proprio",
    areaHa: 20,
    produtividade: 80,
    preco: 164,
    custoColheitaHa: 3000,
    custoTratosHa: 800,
    custosPlantio: [{ nome: "Mudas", valorHa: 2500 }],
    cortes: 5,
    ...over,
  };
}

test("simularPlantio dilui o plantio pelo número de cortes", () => {
  const r = simularPlantio(base());
  // plantio 2500/ha / 5 cortes = 500/ha por corte
  assert.equal(r.custoPlantioHa, 2500);
  assert.equal(r.custoHa, 3000 + 800 + 500);
  assert.equal(r.receitaHa, 80 * 164);
  assert.equal(r.lucroHa, 80 * 164 - (3000 + 800 + 500));
});

test("protocolo mais caro com mais produtividade nem sempre dá maior margem", () => {
  // Simples: 80 t/ha, plantio barato
  const simples = simularPlantio(base());
  // Caro: 110 t/ha, plantio 3× mais caro
  const cenCaro = base({
    id: "c2",
    nome: "Protocolo caro",
    produtividade: 110,
    custosPlantio: [
      { nome: "Mudas selecionadas", valorHa: 6000 },
      { nome: "Correção de solo", valorHa: 2000 },
      { nome: "Calagem", valorHa: 1500 },
    ],
  });
  const caro = simularPlantio(cenCaro);
  // O caro rende mais lucro/ha, mas a margem não sobe na mesma proporção da
  // produtividade (37,5% a mais de t/ha): o custo extra consome a receita extra.
  assert.ok(caro.lucroHa > simples.lucroHa, "caro dá mais lucro/ha");
  assert.equal(
    true,
    caro.margem < simples.margem * 1.375,
    "margem do caro não acompanha o ganho de produtividade",
  );
});

test("rankearCenarios ordena do maior para o menor lucro/ha", () => {
  const pior = base({ id: "pior", produtividade: 40 });
  const melhor = base({ id: "melhor", produtividade: 90 });
  const rank = rankearCenarios([pior, melhor]);
  assert.equal(rank[0].c.id, "melhor");
  assert.equal(rank[1].c.id, "pior");
});

test("detalhePlantio calcula percentuais e produtividade de equilíbrio", () => {
  const d = detalhePlantio(
    base({
      custosPlantio: [
        { nome: "A", valorHa: 1000 },
        { nome: "B", valorHa: 3000 },
      ],
    }),
  );
  assert.equal(d.itens.length, 2);
  assert.equal(d.itens.find((i) => i.nome === "A")?.percentual, 25);
  assert.equal(d.itens.find((i) => i.nome === "B")?.percentual, 75);
  // custo/ha por corte com plantio diluído / preço
  const custoPorCorte = 3000 + 800 + 4000 / 5;
  assert.equal(d.produtividadeEquilibrio, custoPorCorte / 164);
});

test("sem itens de plantio não divide por zero", () => {
  const r = simularPlantio(base({ custosPlantio: [] }));
  assert.equal(r.custoPlantioHa, 0);
  assert.equal(Number.isFinite(r.roi), true);
  assert.equal(Number.isFinite(r.margem), true);
});