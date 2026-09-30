import { test } from "node:test";
import assert from "node:assert/strict";
import type { PrecoMes } from "../src/lib/historico-preco";
import {
  agruparProducaoPorMes,
  compararAtrPreco,
  compararProducaoNosMeses,
  extremosComparacao,
  filtrarColheitas,
  gerarVariacoesPreco,
  opcoesDe,
  precoBaseSugerido,
  serieAtrPreco,
  seriePrecoMensal,
  serieValorProducao,
  simularCenarioPreco,
  variacaoDeEquilibrio,
  VARIACOES_PADRAO,
  type ColheitaReal,
} from "../src/lib/simulador-preco-comparacao";

const perto = (a: number, b: number) => Math.abs(a - b) < 1e-6;

const precos: PrecoMes[] = [
  { ano: 2025, mes: 11, precoMedio: 160 },
  { ano: 2025, mes: 12, precoMedio: 170 },
  { ano: 2026, mes: 1, precoMedio: 180 },
  { ano: 2026, mes: 2, precoMedio: 140 },
];

function colheita(over: Partial<ColheitaReal> = {}): ColheitaReal {
  return {
    id: "c1",
    fazendaId: "f1",
    fazendaNome: "Fazenda Boa Vista",
    usinaId: "u1",
    usinaNome: "Usina Norte",
    usinaModelo: "pindorama",
    safra: "2025/26",
    anoMoagem: 2026,
    mesMoagem: 2,
    toneladas: 1000,
    custoPorTonelada: 120,
    ...over,
  };
}

/* ---------- comparação real ---------- */

test("compara a mesma produção em todos os meses com preço oficial", () => {
  const c = compararProducaoNosMeses({ toneladas: 1000, ano: 2026, mes: 2 }, precos);

  assert.equal(c.toneladas, 1000);
  assert.equal(c.rotuloReal, "Fev/26");
  assert.equal(c.precoMesReal, 140);
  assert.equal(c.valorMesReal, 140_000);
  assert.equal(c.mesesComValor, 4);

  // Janeiro a 180/t vale 40 R$/t a mais que fevereiro.
  const janeiro = c.linhas.find((l) => l.rotulo === "Jan/26");
  assert.equal(janeiro?.valor, 180_000);
  assert.equal(janeiro?.diferencaValor, 40_000);
  assert.ok(perto(janeiro?.variacaoPct ?? 0, ((180_000 - 140_000) / 140_000) * 100));
});

test("destaca o mês real de moagem e o classifica como REAL", () => {
  const c = compararProducaoNosMeses({ toneladas: 1000, ano: 2026, mes: 1 }, precos);
  const reais = c.linhas.filter((l) => l.ehMoagemReal);
  assert.equal(reais.length, 1);
  assert.equal(reais[0].rotulo, "Jan/26");
  assert.equal(reais[0].origem, "real");
  assert.equal(reais[0].diferencaValor, 0);
  // Todas as linhas com preço oficial são REAL.
  assert.ok(c.linhas.filter((l) => l.origem !== null).every((l) => l.origem === "real"));
});

test("meses posteriores ao último preço oficial entram como PROJEÇÃO", () => {
  const c = compararProducaoNosMeses({ toneladas: 1000, ano: 2026, mes: 2 }, precos, {
    mesesProjecao: 2,
    mesesMedia: 6,
  });
  const projecoes = c.linhas.filter((l) => l.origem === "projecao");
  // Março e abril projetados pela média de 4 meses = 162,5.
  assert.deepEqual(
    projecoes.map((l) => l.rotulo),
    ["Mar/26", "Abr/26"],
  );
  assert.ok(perto(projecoes[0].preco ?? 0, 162.5));
  assert.ok(perto(projecoes[0].valor ?? 0, 162_500));
});

test("meses sem preço entre o primeiro e o último registro ficam sem valor", () => {
  // Série com lacuna: só outubro e dezembro têm preço cadastrado.
  const comLacuna: PrecoMes[] = [
    { ano: 2025, mes: 10, precoMedio: 150 },
    { ano: 2025, mes: 12, precoMedio: 170 },
  ];
  const c = compararProducaoNosMeses({ toneladas: 1000, ano: 2025, mes: 10 }, comLacuna);

  const semPreco = c.linhas.filter((l) => l.preco === null);
  assert.deepEqual(
    semPreco.map((l) => l.rotulo),
    ["Nov/25"],
  );
  assert.ok(semPreco.every((l) => l.origem === null && l.valor === null && l.diferencaValor === null));
  assert.deepEqual(
    c.linhas.map((l) => l.rotulo),
    ["Out/25", "Nov/25", "Dez/25"],
  );
  assert.equal(c.mesesComValor, 2);
});

test("sem nenhum preço cadastrado a comparação não inventa valor", () => {
  const c = compararProducaoNosMeses({ toneladas: 1000, ano: 2026, mes: 2 }, []);
  assert.equal(c.precoMesReal, null);
  assert.equal(c.valorMesReal, null);
  assert.equal(c.mesesComValor, 0);
  assert.deepEqual(
    c.linhas.map((l) => l.rotulo),
    ["Fev/26"],
  );
  assert.equal(c.linhas[0].ehMoagemReal, true);
});

test("toneladas negativas não geram receita negativa", () => {
  const c = compararProducaoNosMeses({ toneladas: -500, ano: 2026, mes: 2 }, precos);
  assert.equal(c.toneladas, 0);
  assert.equal(c.valorMesReal, 0);
  assert.ok(c.linhas.every((l) => l.valor === 0));
});

test("extremos acham o mês de maior e de menor valor", () => {
  const c = compararProducaoNosMeses({ toneladas: 1000, ano: 2026, mes: 2 }, precos);
  const { maior, menor } = extremosComparacao(c);
  assert.equal(maior?.rotulo, "Jan/26");
  assert.equal(menor?.rotulo, "Fev/26");
});

test("séries dos gráficos separam preço oficial de preço projetado", () => {
  const c = compararProducaoNosMeses({ toneladas: 1000, ano: 2026, mes: 2 }, precos, { mesesProjecao: 1 });
  const serie = seriePrecoMensal(c);
  const marco = serie.find((s) => s.rotulo === "Mar/26");
  assert.equal(marco?.precoOficial, null);
  assert.ok(perto(marco?.precoProjetado ?? 0, 162.5));
  assert.equal(serie.find((s) => s.rotulo === "Fev/26")?.precoOficial, 140);

  const valores = serieValorProducao(c);
  assert.equal(valores.find((v) => v.rotulo === "Fev/26")?.ehMoagemReal, true);
  assert.equal(valores.find((v) => v.rotulo === "Jan/26")?.ehMoagemReal, false);
});

test("reaproveita a regra da usina: Pindorama soma o ágio e Coruripe não", () => {
  const pindorama = compararProducaoNosMeses(
    { toneladas: 1000, ano: 2026, mes: 2, modelo: "pindorama", agio: 12 },
    precos,
  );
  assert.equal(pindorama.valorMesReal, (140 + 12) * 1000);
  assert.equal(pindorama.linhas.find((l) => l.rotulo === "Jan/26")?.valor, (180 + 12) * 1000);
  // O ágio entra nos dois lados, então a diferença entre meses não muda.
  assert.equal(pindorama.linhas.find((l) => l.rotulo === "Jan/26")?.diferencaValor, 40_000);

  const coruripe = compararProducaoNosMeses(
    { toneladas: 1000, ano: 2026, mes: 2, modelo: "coruripe", agio: 12 },
    precos,
  );
  assert.equal(coruripe.valorMesReal, 140_000);
  assert.equal(coruripe.linhas.find((l) => l.rotulo === "Jan/26")?.valor, 180_000);
});

/* ---------- ATR x preço ---------- */

const precosComAtr: PrecoMes[] = [
  { ano: 2025, mes: 11, precoMedio: 155, atrPorTonelada: 130 },
  { ano: 2025, mes: 12, precoMedio: 160, atrPorTonelada: 135 },
  { ano: 2026, mes: 1, precoMedio: 180, atrPorTonelada: 132 },
  { ano: 2026, mes: 2, precoMedio: 140, precoKgAtr: 0.145 },
];

test("série ATR x preço separa o registrado do ausente — sem fingir ATR zero", () => {
  const s = serieAtrPreco(precosComAtr, { ano: 2026, mes: 1 });
  assert.equal(s.length, 4);
  assert.equal(s[0].atr, 130);
  assert.equal(s[0].rotulo, "Nov/25");
  // Fevereiro não tem ATR: null, nunca 0.
  assert.equal(s[3].atr, null);
  assert.equal(s[3].preco, 140);
  assert.equal(s[3].precoKgAtr, 0.145);
  assert.equal(s[2].ehMoagemReal, true);
  assert.equal(s[0].ehMoagemReal, false);
});

test("diferença ATR x preço: variações na mesma janela e meses em sentidos opostos", () => {
  const r = compararAtrPreco(precosComAtr);
  // Só Nov a Jan têm ATR; o preço é medido na mesma janela (Nov 155 → Jan 180).
  assert.equal(r.mesesComAtr, 3);
  assert.ok(perto(r.variacaoAtr ?? 0, ((132 - 130) / 130) * 100));
  assert.ok(perto(r.variacaoPreco ?? 0, ((180 - 155) / 155) * 100));
  // Dez→Jan: ATR caiu enquanto o preço subiu.
  assert.equal(r.mesesContrarios, 1);
});

test("sem ATR cadastrado a comparação não inventa variação", () => {
  const r = compararAtrPreco(precos);
  assert.equal(r.mesesComAtr, 0);
  assert.equal(r.variacaoAtr, null);
  assert.equal(r.variacaoPreco, null);
  assert.equal(r.mesesContrarios, 0);
  assert.ok(serieAtrPreco(precos).every((p) => p.atr === null));
});

/* ---------- agrupamento ---------- */

test("agrupa colheitas da mesma fazenda no mesmo mês", () => {
  const grupos = agruparProducaoPorMes([
    colheita({ id: "c1", toneladas: 1000, custoPorTonelada: 100 }),
    colheita({ id: "c2", toneladas: 500, custoPorTonelada: 140 }),
    colheita({ id: "c3", mesMoagem: 3, toneladas: 200 }),
    colheita({ id: "c4", mesMoagem: 2, fazendaId: "f2", fazendaNome: "Fazenda Boa Esperança" }),
  ]);

  assert.equal(grupos.length, 3);
  const principal = grupos.find((g) => g.fazendaId === "f1" && g.mes === 2);
  assert.equal(principal?.toneladas, 1500);
  assert.equal(principal?.qtdColheitas, 2);
  // Custo por tonelada ponderado pelas toneladas: (100*1000 + 140*500) / 1500
  assert.ok(perto(principal?.custoPorTonelada ?? 0, (100 * 1000 + 140 * 500) / 1500));
  assert.equal(principal?.custoTotal, 100 * 1000 + 140 * 500);
});

test("agrupamento sai em ordem cronológica", () => {
  const grupos = agruparProducaoPorMes([
    colheita({ id: "c1", mesMoagem: 3, anoMoagem: 2026 }),
    colheita({ id: "c2", mesMoagem: 11, anoMoagem: 2025 }),
  ]);
  assert.deepEqual(
    grupos.map((g) => g.rotulo),
    ["Nov/25", "Mar/26"],
  );
});

/* ---------- filtros ---------- */

test("filtros de safra, fazenda, usina e período", () => {
  const lista = [
    colheita({ id: "a", mesMoagem: 11, anoMoagem: 2025, safra: "2025/26" }),
    colheita({ id: "b", mesMoagem: 2, anoMoagem: 2026, safra: "2025/26", usinaId: "u2" }),
    colheita({ id: "c", mesMoagem: 3, anoMoagem: 2026, safra: null, fazendaId: "f2" }),
  ];

  assert.deepEqual(
    filtrarColheitas(lista, {}).map((c) => c.id),
    ["a", "b", "c"],
  );
  assert.deepEqual(
    filtrarColheitas(lista, { safra: "2025/26" }).map((c) => c.id),
    ["a", "b"],
  );
  // null busca só quem está sem safra; undefined não filtra.
  assert.deepEqual(
    filtrarColheitas(lista, { safra: null }).map((c) => c.id),
    ["c"],
  );
  assert.deepEqual(
    filtrarColheitas(lista, { usinaId: "u2" }).map((c) => c.id),
    ["b"],
  );
  assert.deepEqual(
    filtrarColheitas(lista, { periodo: { de: { ano: 2026, mes: 1 }, ate: null } }).map((c) => c.id),
    ["b", "c"],
  );
  assert.deepEqual(
    filtrarColheitas(lista, { periodo: { de: null, ate: { ano: 2025, mes: 12 } } }).map((c) => c.id),
    ["a"],
  );
  // Período invertido não devolve nada.
  assert.deepEqual(
    filtrarColheitas(lista, { periodo: { de: { ano: 2026, mes: 5 }, ate: { ano: 2026, mes: 1 } } }),
    [],
  );
});

test("opcoesDe lista safras, fazendas e usinas sem repetir", () => {
  const o = opcoesDe([
    colheita({ id: "a", safra: "2025/26" }),
    colheita({ id: "b", safra: "2025/26", usinaId: "u2", usinaNome: "Usina Sul" }),
    colheita({ id: "c", safra: null }),
  ]);
  assert.deepEqual(o.safras, ["2025/26"]);
  assert.equal(o.fazendas.length, 1);
  assert.deepEqual(
    o.usinas.map((u) => u.nome),
    ["Usina Norte", "Usina Sul"],
  );
});

/* ---------- cenário de preço ---------- */

test("cenário simulado multiplica preço por toneladas", () => {
  const r = simularCenarioPreco({ preco: 150, toneladas: 1000, custoPorTonelada: 0, origem: "simulacao" });
  assert.equal(r.receita, 150_000);
  assert.equal(r.custoTotal, null);
  assert.equal(r.valorLiquido, null);
  assert.equal(r.origem, "simulacao");
});

test("cenário com custo devolve valor líquido", () => {
  const r = simularCenarioPreco({ preco: 150, toneladas: 1000, custoPorTonelada: 120, origem: "simulacao" });
  assert.equal(r.custoTotal, 120_000);
  assert.equal(r.valorLiquido, 30_000);
});

test("preço negativo e toneladas negativas são zerados", () => {
  const r = simularCenarioPreco({ preco: -10, toneladas: -5, custoPorTonelada: 0, origem: "simulacao" });
  assert.equal(r.preco, 0);
  assert.equal(r.toneladas, 0);
  assert.equal(r.receita, 0);
});

test("precoBaseSugerido usa o último oficial e cai para a média", () => {
  assert.equal(precoBaseSugerido(precos), 140);
  assert.ok(perto(precoBaseSugerido([], 6), 0));
});

/* ---------- alta e baixa ---------- */

test("variações vão de -20% a +20% e a 0% reproduz o preço base", () => {
  const linhas = gerarVariacoesPreco(100, 1000);
  assert.equal(linhas.length, VARIACOES_PADRAO.length);
  assert.deepEqual(
    linhas.map((l) => l.variacaoPct),
    [-20, -15, -10, -5, 0, 5, 10, 15, 20],
  );

  const base = linhas.find((l) => l.ehBase);
  assert.equal(base?.preco, 100);
  assert.equal(base?.receita, 100_000);
  assert.equal(base?.diferencaValor, 0);
  assert.equal(base?.origem, "real");

  const alta = linhas.find((l) => l.variacaoPct === 20);
  assert.equal(alta?.preco, 120);
  assert.equal(alta?.receita, 120_000);
  assert.equal(alta?.diferencaValor, 20_000);
  assert.equal(alta?.origem, "simulacao");

  const baixa = linhas.find((l) => l.variacaoPct === -20);
  assert.equal(baixa?.preco, 80);
  assert.equal(baixa?.diferencaValor, -20_000);
});

test("variação com custo devolve o valor líquido de cada cenário", () => {
  const linhas = gerarVariacoesPreco(100, 1000, { custoPorTonelada: 120 });
  // Com 120/t de custo, o preço de 100/t dá -20.000 e o de 120/t dá zero.
  assert.equal(linhas.find((l) => l.ehBase)?.valorLiquido, -20_000);
  assert.equal(linhas.find((l) => l.variacaoPct === 20)?.valorLiquido, 0);
  assert.ok(perto(variacaoDeEquilibrio(100, 1000, 120) ?? 0, 20));
});

test("preço-base zero não quebra as variações", () => {
  const linhas = gerarVariacoesPreco(0, 1000);
  assert.ok(linhas.every((l) => l.preco === 0 && l.receita === 0));
  assert.equal(variacaoDeEquilibrio(0, 1000, 120), null);
});