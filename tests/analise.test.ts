import { test } from "node:test";
import assert from "node:assert/strict";
import { agregarPorTalhao } from "../src/lib/analise";

const talhoes = [
  { id: "a", nome: "A", fazendaId: "f1", areaHa: 10 },
  { id: "b", nome: "B", fazendaId: "f1", areaHa: 30 },
];
const nomeFazenda = new Map([["f1", "Fazenda 1"]]);
const soma = (l: { plantio: number }[]) => l.reduce((s, a) => s + a.plantio, 0);

test("plantio em vários talhões não é contado em duplicidade", () => {
  const lista = agregarPorTalhao({
    talhoes,
    nomeFazenda,
    plantios: [{ fazendaId: "f1", valor: 4000, talhoesIds: ["a", "b"] }],
    tratos: [],
    colheitas: [],
  });
  assert.ok(Math.abs(soma(lista) - 4000) < 1e-6);
  assert.ok(Math.abs(lista.find((x) => x.talhaoId === "b")!.plantio - 3000) < 1e-6);
});

test("registro de fazenda inteira entra no total (rateado por área)", () => {
  const lista = agregarPorTalhao({
    talhoes,
    nomeFazenda,
    plantios: [],
    tratos: [{ fazendaId: "f1", valor: 800 }],
    colheitas: [],
  });
  assert.equal(lista.reduce((s, a) => s + a.tratos, 0), 800);
});

test("colheita antiga sem talhões informados ainda aparece", () => {
  const lista = agregarPorTalhao({
    talhoes,
    nomeFazenda,
    plantios: [],
    tratos: [],
    colheitas: [{ fazendaId: "f1", toneladas: 400, areaHa: 40, receita: 60000, despesas: 20000 }],
  });
  assert.equal(lista.reduce((s, a) => s + a.toneladas, 0), 400);
  assert.equal(lista.reduce((s, a) => s + a.receita, 0), 60000);
  const a = lista.find((x) => x.talhaoId === "a")!;
  assert.ok(Math.abs(a.toneladas / a.haColhidos - 10) < 1e-9);
});

test("filtrar por talhão mostra só a parte dele, sem alterar o rateio", () => {
  const lista = agregarPorTalhao({
    talhoes,
    nomeFazenda,
    plantios: [{ fazendaId: "f1", valor: 4000, talhoesIds: ["a", "b"] }],
    tratos: [],
    colheitas: [],
    talhaoFiltro: "a",
  });
  assert.equal(lista.length, 1);
  assert.ok(Math.abs(lista[0].plantio - 1000) < 1e-6);
});
