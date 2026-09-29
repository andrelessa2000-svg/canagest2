import { test } from "node:test";
import assert from "node:assert/strict";
import { areaColhidaHa, areaRegistroHa, fracoesDoRegistro, type TalhaoBase } from "../src/lib/rateio";
import { TAREFAS_POR_HA } from "../src/lib/format";

const talhoes: TalhaoBase[] = [
  { id: "a", fazendaId: "f1", areaHa: 10 },
  { id: "b", fazendaId: "f1", areaHa: 30 },
  { id: "c", fazendaId: "f1", areaHa: 20 },
  { id: "x", fazendaId: "f2", areaHa: 99 },
];

const soma = (fr: { fracao: number }[]) => fr.reduce((s, f) => s + f.fracao, 0);
const de = (fr: { talhaoId: string; fracao: number }[], id: string) =>
  fr.find((f) => f.talhaoId === id)?.fracao ?? 0;

test("registro em vários talhões é dividido pela área e soma 100%", () => {
  const fr = fracoesDoRegistro({ talhoesIds: ["a", "b"] }, "f1", talhoes);
  assert.equal(soma(fr), 1);
  assert.ok(Math.abs(de(fr, "a") - 0.25) < 1e-9);
  assert.ok(Math.abs(de(fr, "b") - 0.75) < 1e-9);
});

test("porções: talhão inteiro (tarefas null) + parte informada em tarefas", () => {
  const tarefasDoA = 10 * TAREFAS_POR_HA;
  const fr = fracoesDoRegistro(
    {
      alocacoes: [
        { talhaoId: "a", tarefas: null, completo: true },
        { talhaoId: "b", tarefas: tarefasDoA, completo: false },
      ],
    },
    "f1",
    talhoes,
  );
  assert.equal(soma(fr), 1);
  assert.ok(Math.abs(de(fr, "a") - 0.5) < 1e-9);
  assert.ok(Math.abs(de(fr, "b") - 0.5) < 1e-9);
});

test("fazenda inteira sem talhões informados: rateia só entre talhões da própria fazenda", () => {
  const fr = fracoesDoRegistro({}, "f1", talhoes);
  assert.equal(fr.length, 3);
  assert.equal(de(fr, "x"), 0);
  assert.ok(Math.abs(de(fr, "b") - 0.5) < 1e-9);
  assert.equal(soma(fr), 1);
});

test("colheita usa talhoesColhidos com as áreas informadas", () => {
  const fr = fracoesDoRegistro(
    {
      talhoesColhidos: [
        { id: "a", areaHa: 5 },
        { id: "c", areaHa: 15 },
      ],
    },
    "f1",
    talhoes,
  );
  assert.ok(Math.abs(de(fr, "a") - 0.25) < 1e-9);
  assert.ok(Math.abs(de(fr, "c") - 0.75) < 1e-9);
});

test("talhão único e talhão desconhecido", () => {
  assert.deepEqual(fracoesDoRegistro({ talhaoId: "b" }, "f1", talhoes), [{ talhaoId: "b", fracao: 1 }]);
  assert.deepEqual(fracoesDoRegistro({ talhoesIds: ["zzz"] }, "fx", talhoes), []);
});

test("sem nenhum talhão cadastrado o resultado é vazio (sem dividir por zero)", () => {
  assert.deepEqual(fracoesDoRegistro({}, "f1", []), []);
});

test("areaColhida é gravada em TAREFAS e deve virar hectares", () => {
  const ha = areaColhidaHa({ areaColhida: 33.058 }, "f1", talhoes);
  assert.ok(Math.abs(ha - 10) < 1e-6);
});

test("área colhida cai para talhoesColhidos e depois para a fazenda toda", () => {
  assert.equal(areaColhidaHa({ talhoesColhidos: [{ id: "a", areaHa: 4 }, { id: "b", areaHa: 6 }] }, "f1", talhoes), 10);
  assert.equal(areaColhidaHa({}, "f1", talhoes), 60);
});

test("área de plantio/trato: tarefas, areaHa, fazenda inteira ou talhões", () => {
  assert.ok(Math.abs(areaRegistroHa({ tarefas: 33.058 }, "f1", talhoes) - 10) < 1e-6);
  assert.equal(areaRegistroHa({ areaHa: 7 }, "f1", talhoes), 7);
  assert.equal(areaRegistroHa({ escopo: "fazenda" }, "f1", talhoes), 60);
  assert.equal(areaRegistroHa({ escopo: "talhao", talhoesIds: ["a", "c"] }, "f1", talhoes), 30);
  assert.equal(areaRegistroHa({ escopo: "talhao" }, "f1", talhoes), 0);
});
