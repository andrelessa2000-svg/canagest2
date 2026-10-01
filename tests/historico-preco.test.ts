import { test } from "node:test";
import assert from "node:assert/strict";
import {
  compararCenarios,
  deslocarMes,
  mediaMovel,
  mesAnterior,
  obterPreco,
  ordenar,
  proximoMes,
  rotulo,
  serieMensal,
  temPreco,
  variacao,
  type PrecoMes,
} from "../src/lib/historico-preco";

const perto = (a: number, b: number) => Math.abs(a - b) < 1e-6;

const serie: PrecoMes[] = [
  { ano: 2025, mes: 10, precoMedio: 150 },
  { ano: 2025, mes: 11, precoMedio: 160 },
  { ano: 2025, mes: 12, precoMedio: 170 },
  { ano: 2026, mes: 1, precoMedio: 180 },
  { ano: 2026, mes: 2, precoMedio: 140 },
];

test("deslocarMes atravessa a virada de ano nos dois sentidos", () => {
  assert.deepEqual(deslocarMes(2026, 1, -1), { ano: 2025, mes: 12 });
  assert.deepEqual(deslocarMes(2025, 12, 1), { ano: 2026, mes: 1 });
  assert.deepEqual(deslocarMes(2026, 6, 0), { ano: 2026, mes: 6 });
  assert.deepEqual(mesAnterior(2026, 3), { ano: 2026, mes: 2 });
  assert.deepEqual(proximoMes(2026, 11), { ano: 2026, mes: 12 });
});

test("ordenar e obterPreco ignoram a ordem de entrada", () => {
  const bagunçado: PrecoMes[] = [
    { ano: 2026, mes: 2, precoMedio: 140 },
    { ano: 2025, mes: 12, precoMedio: 170 },
    { ano: 2026, mes: 1, precoMedio: 180 },
  ];
  const o = ordenar(bagunçado);
  assert.deepEqual(
    o.map((p) => `${p.ano}-${p.mes}`),
    ["2025-12", "2026-1", "2026-2"],
  );
  assert.equal(obterPreco(bagunçado, 2026, 1), 180);
  assert.equal(obterPreco(bagunçado, 2019, 5), undefined);
});

test("rotulo usa a abreviação do mes e o ano com dois digitos", () => {
  assert.equal(rotulo(2026, 1), "Jan/26");
  assert.equal(rotulo(2025, 12), "Dez/25");
});

test("mediaMovel usa somente os ultimos N meses informados", () => {
  assert.ok(perto(mediaMovel(serie, 2), (180 + 140) / 2));
  assert.ok(perto(mediaMovel(serie, 3), (170 + 180 + 140) / 3));
  assert.ok(perto(mediaMovel(serie, 99), (150 + 160 + 170 + 180 + 140) / 5));
  assert.equal(mediaMovel([], 6), 0);
});

test("variacao so funciona com base positiva", () => {
  assert.ok(perto(variacao(100, 110) ?? 0, 10));
  assert.ok(perto(variacao(100, 80) ?? 0, -20));
  assert.equal(variacao(0, 100), null);
  assert.equal(variacao(-10, 100), null);
});

test("mes cadastrado so com ATR (preco 0) nao vira -100% nem derruba a media", () => {
  // o mes de outubro entrou apenas com ATR, entao chega com precoMedio 0
  const comAtr = [...serie, { ano: 2026, mes: 3, precoMedio: 0, atrPorTonelada: null, precoKgAtr: 1.2681 }];

  assert.equal(temPreco(comAtr[0]), true);
  assert.equal(temPreco(comAtr[comAtr.length - 1]), false);

  // sem base de preco nao ha variacao a mostrar
  assert.equal(variacao(140, 0), null);

  // a media conta apenas meses com preco: pega os 3 ultimos precados
  // (170, 180, 140) em vez de puxar o mes sem preco como se fosse R$ 0
  assert.ok(perto(mediaMovel(comAtr, 3), (170 + 180 + 140) / 3));
  // e nao deforma a media de 6 meses, que antes cairia para 150
  assert.ok(perto(mediaMovel(comAtr, 6), (150 + 160 + 170 + 180 + 140) / 5));
});

test("compararCenarios quantifica a perda de esperar o mes cair", () => {
  // Janeiro caiu de 180 para 140: 40 R$/t de diferença sobre 1000 t.
  const c = compararCenarios(serie, { ano: 2026, mes: 2 }, 1000);

  assert.ok(c.passado);
  assert.ok(c.atual);
  assert.equal(c.passado?.preco, 180);
  assert.equal(c.atual?.preco, 140);
  assert.equal(c.passado?.receita, 180_000);
  assert.equal(c.atual?.receita, 140_000);
  assert.equal(c.passado?.diferenca, 40_000);
  assert.equal(c.atual?.diferenca, 0);
  // Esperar custou R$ 40.000 contra a decisão de colher em janeiro.
  assert.equal(c.custoDeEsperar, 40_000);
});

test("mes seguinte sem registro cai para a media movel", () => {
  const c = compararCenarios(serie, { ano: 2026, mes: 2 }, 1000);
  // Fevereiro e o ultimo mes da serie, entao nao existe marco: usa a media de 6 (n=5).
  assert.equal(c.futuro?.origem, "media");
  assert.ok(perto(c.futuro?.preco ?? 0, (150 + 160 + 170 + 180 + 140) / 5));
});

test("mes seguinte cadastrado tem prioridade sobre a media", () => {
  const comFuturo: PrecoMes[] = [...serie, { ano: 2026, mes: 3, precoMedio: 200 }];
  const c = compararCenarios(comFuturo, { ano: 2026, mes: 2 }, 1000);
  assert.equal(c.futuro?.origem, "mes");
  assert.equal(c.futuro?.preco, 200);
  assert.equal(c.futuro?.rotulo, "Mar/26");
  assert.equal(c.futuro?.diferenca, 60_000);
});

test("serie sem nenhum dos tres meses nao simula nada", () => {
  const c = compararCenarios(serie, { ano: 2030, mes: 7 }, 1000);
  assert.equal(c.passado, null);
  assert.equal(c.atual, null);
  assert.equal(c.futuro, null);
  assert.equal(c.custoDeEsperar, 0);
});

test("serieMensal preenche lacunas com null e ordena do mais antigo ao atual", () => {
  const s = serieMensal(serie, 4, { ano: 2026, mes: 2 });
  assert.deepEqual(
    s.map((m) => m.rotulo),
    ["Nov/25", "Dez/25", "Jan/26", "Fev/26"],
  );
  assert.deepEqual(
    s.map((m) => m.preco),
    [160, 170, 180, 140],
  );
  assert.equal(s[0].preco, 160);
});

test("serieMensal marca meses sem registro como null", () => {
  const s = serieMensal([{ ano: 2026, mes: 2, precoMedio: 140 }], 3, { ano: 2026, mes: 2 });
  assert.deepEqual(
    s.map((m) => m.preco),
    [null, null, 140],
  );
});

test("compararCenarios ignora toneladas negativas", () => {
  const c = compararCenarios(serie, { ano: 2026, mes: 2 }, -500);
  assert.equal(c.passado?.receita, 0);
  assert.equal(c.custoDeEsperar, 0);
});
