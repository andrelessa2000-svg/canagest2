import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calcularProtocolo,
  calcularServico,
  custoPorHa,
  rankearProtocolos,
  type ItemCusto,
} from "../src/lib/projecoes";

const itens = (custom: ItemCusto[] = []): ItemCusto[] => [
  { nome: "Mudas", valor: 2500, unidade: "ha" },
  ...custom,
];

test("custoPorHa converte valor total pela área", () => {
  // 2500/ha + 10000 total / 10 = 3500/ha
  const c = custoPorHa(
    [
      { nome: "Mudas", valor: 2500, unidade: "ha" },
      { nome: "Preparo", valor: 10000, unidade: "total" },
    ],
    10,
  );
  assert.equal(c, 3500);
});

test("custoPorHa sem área devolve somente os custos por hectare", () => {
  const c = custoPorHa(itens([{ nome: "Preparo", valor: 8000, unidade: "total" }]), 0);
  assert.equal(c, 2500);
});

test("calcularServico custo total e margem com produtividade", () => {
  const r = calcularServico({
    id: "s1",
    nome: "Serviço",
    tipo: "plantio",
    tipoExecucao: "propria",
    areaHa: 20,
    custos: itens(),
    produtividade: 85,
    preco: 164,
  });
  assert.equal(r.custoServicoHa, 2500);
  assert.equal(r.custoServicoTotal, 50000);
  assert.equal(r.receitaHa, 85 * 164);
  assert.equal(r.lucroHa, 85 * 164 - 2500);
});

test("calcularServico sem produtividade não inventa receita", () => {
  const r = calcularServico({
    id: "s1",
    nome: "Só custo",
    tipo: "adubacao",
    tipoExecucao: "terceirizada",
    areaHa: 10,
    custos: itens([{ nome: "Adubo", valor: 3000, unidade: "ha" }]),
    produtividade: null,
    preco: null,
  });
  assert.equal(r.receitaHa, 0);
  assert.equal(r.margem, 0);
});

test("calcularProtocolo dilui o custo pelos cortes", () => {
  const r = calcularProtocolo({
    id: "p1",
    nome: "Protocolo caro",
    areaHa: 20,
    produtividade: 110,
    preco: 164,
    cortes: 5,
    custos: itens([{ nome: "Correção", valor: 2000, unidade: "ha" }]),
  });
  // plantio 4500/ha / 5 = 900/ha por corte
  assert.equal(r.custoPlantioHa, 4500);
  assert.equal(r.custoPlantioPorCorteHa, 900);
  assert.equal(r.receitaHa, 110 * 164);
  assert.equal(r.lucroHa, 110 * 164 - 900);
});

test("protocolo caro pode dar mais produtividade sem proporcional margem", () => {
  const simples = calcularProtocolo({
    id: "p1",
    nome: "Simples",
    areaHa: 20,
    produtividade: 80,
    preco: 164,
    cortes: 5,
    custos: itens(),
  });
  const caro = calcularProtocolo({
    id: "p2",
    nome: "Caro",
    areaHa: 20,
    produtividade: 110,
    preco: 164,
    cortes: 5,
    custos: itens([
      { nome: "Mudas selecionadas", valor: 4000, unidade: "ha" },
      { nome: "Correção", valor: 2000, unidade: "ha" },
    ]),
  });
  assert.ok(caro.lucroHa > simples.lucroHa, "caro dá mais lucro/ha");
  assert.equal(true, caro.margem < simples.margem * 1.375, "margem do caro não acompanha produtividade");
});

test("rankearProtocolos ordena do maior lucro/ha", () => {
  const pior = {
    id: "pior",
    nome: "Pior",
    areaHa: 20,
    produtividade: 40,
    preco: 164,
    cortes: 5,
    custos: itens(),
  };
  const melhor = { ...pior, id: "melhor", produtividade: 90, custos: itens() };
  const rank = rankearProtocolos([pior, melhor]);
  assert.equal(rank[0].p.id, "melhor");
  assert.equal(rank[1].p.id, "pior");
});

test("sem itens não divide por zero", () => {
  const r = calcularProtocolo({
    id: "p1",
    nome: "Vazio",
    areaHa: 10,
    produtividade: 80,
    preco: 164,
    cortes: 5,
    custos: [],
  });
  assert.equal(r.custoPlantioHa, 0);
  assert.equal(Number.isFinite(r.margem), true);
  assert.equal(Number.isFinite(r.roi), true);
});