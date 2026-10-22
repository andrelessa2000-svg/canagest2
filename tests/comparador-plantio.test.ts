import { test } from "node:test";
import assert from "node:assert/strict";
import {
  detalheOperacao,
  rankearOperacoes,
  simularOperacao,
  custoFocoHa,
  type CenarioOperacao,
} from "../src/lib/comparador-plantio";

function base(over: Partial<CenarioOperacao> = {}): CenarioOperacao {
  return {
    id: "c1",
    tipo: "plantio",
    modo: "proprio",
    nome: "Protocolo simples",
    areaHa: 20,
    produtividade: 80,
    preco: 164,
    cortes: 5,
    custosFoco: [{ nome: "Mudas", valor: 2500, unidade: "ha" }],
    custoColheitaHa: 3000,
    custoTratosHa: 800,
    custoPlantioHa: 2500,
    ...over,
  };
}

test("plantio: dilui o custo do plantio pelo número de cortes", () => {
  // custosFoco = 2500/ha; plantio diluído = 2500/5 = 500; + colheita 3000 + tratos 800
  const r = simularOperacao(base());
  assert.equal(r.custoFocoHa, 2500);
  assert.equal(r.custoHa, 500 + 3000 + 800);
  assert.equal(r.receitaHa, 80 * 164);
  assert.equal(r.lucroHa, 80 * 164 - 4300);
});

test("colheita: custo por hectare entra inteiro no corte", () => {
  const r = simularOperacao(
    base({
      tipo: "colheita",
      modo: "mecanizada-propria",
      custosFoco: [{ nome: "Colheita mecanizada", valor: 3500, unidade: "ha" }],
    }),
  );
  // colheita 3500 + tratos 800 + plantio diluído 2500/5=500
  assert.equal(r.custoHa, 3500 + 800 + 500);
  // lucro = receita − custo
  assert.equal(r.lucroHa, 80 * 164 - (3500 + 800 + 500));
});

test("custo total é convertido para por hectare usando a área", () => {
  const c = base({ custosFoco: [{ nome: "Preparo", valor: 60000, unidade: "total" }] });
  // 60.000 / 20 ha = 3.000/ha
  assert.equal(custoFocoHa(c), 3000);
  const r = simularOperacao(c);
  assert.equal(r.custoFocoHa, 3000);
});

test("protocolo mais caro com mais produtividade nem sempre dá maior margem", () => {
  const simples = simularOperacao(base());
  const caro = simularOperacao(
    base({
      id: "c2",
      nome: "Protocolo caro",
      produtividade: 110,
      custosFoco: [
        { nome: "Mudas selecionadas", valor: 6000, unidade: "ha" },
        { nome: "Correção de solo", valor: 2000, unidade: "ha" },
        { nome: "Calagem", valor: 1500, unidade: "ha" },
      ],
    }),
  );
  assert.ok(caro.lucroHa > simples.lucroHa, "caro dá mais lucro/ha");
  assert.equal(
    true,
    caro.margem < simples.margem * 1.375,
    "margem do caro não acompanha o ganho de produtividade",
  );
});

test("rankearOperacoes ordena do maior para o menor lucro/ha", () => {
  const pior = base({ id: "pior", produtividade: 40 });
  const melhor = base({ id: "melhor", produtividade: 90 });
  const rank = rankearOperacoes([pior, melhor]);
  assert.equal(rank[0].c.id, "melhor");
  assert.equal(rank[1].c.id, "pior");
});

test("detalheOperacao calcula percentuais e produtividade de equilíbrio", () => {
  const d = detalheOperacao(
    base({
      custosFoco: [
        { nome: "A", valor: 1000, unidade: "ha" },
        { nome: "B", valor: 3000, unidade: "ha" },
      ],
    }),
  );
  assert.equal(d.itens.length, 2);
  assert.equal(d.itens.find((i) => i.nome === "A")?.percentual, 25);
  assert.equal(d.itens.find((i) => i.nome === "B")?.percentual, 75);
  // custo/ha por corte = plantio diluído (4000/5) + colheita 3000 + tratos 800
  const custoPorCorte = 4000 / 5 + 3000 + 800;
  assert.equal(d.produtividadeEquilibrio, custoPorCorte / 164);
});

test("sem itens de custo não divide por zero", () => {
  const r = simularOperacao(base({ custosFoco: [] }));
  assert.equal(r.custoFocoHa, 0);
  assert.equal(Number.isFinite(r.roi), true);
  assert.equal(Number.isFinite(r.margem), true);
});

test("misto: custo por ha + custo total no mesmo cenário", () => {
  const c = base({
    areaHa: 10,
    custosFoco: [
      { nome: "Combustível", valor: 120, unidade: "ha" },
      { nome: "Mão de obra", valor: 800, unidade: "total" },
    ],
  });
  // 120 + 800/10 = 200/ha
  assert.equal(custoFocoHa(c), 200);
});

test("manejo manual da colheita pode ser mais barato que mecanizado", () => {
  const mecanizado = simularOperacao(
    base({
      tipo: "colheita",
      id: "mec",
      custosFoco: [{ nome: "Colheita mecanizada", valor: 3500, unidade: "ha" }],
    }),
  );
  const manual = simularOperacao(
    base({
      tipo: "colheita",
      id: "man",
      custosFoco: [{ nome: "Colheita manual", valor: 2800, unidade: "ha" }],
    }),
  );
  assert.ok(manual.custoHa < mecanizado.custoHa);
  assert.ok(manual.lucroHa > mecanizado.lucroHa);
});