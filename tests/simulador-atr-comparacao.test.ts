import { test } from "node:test";
import assert from "node:assert/strict";
import {
  agruparPorMoinada,
  acharAtr,
  compararAtrReal,
  mesesComAtr,
  proximoMesAtr,
  rotuloMes,
  serieAtrComparativo,
  serieAtrMensal,
  simularMes,
  simularProximoMes,
  ultimoMesAtr,
  valorNoMes,
  type ColheitaComReceita,
  type MesAtr,
} from "../src/lib/simulador-atr-comparacao";

/** Tolerância relativa: os valores são de centenas de milhares de reais. */
const perto = (a: number, b: number) => Math.abs(a - b) < Math.max(Math.abs(b) * 1e-9, 1e-6);

/** Ago = 1,3120 · Set = 1,2784 (R$/kg de ATR) */
const atrs: MesAtr[] = [
  { ano: 2025, mes: 8, precoKgAtr: 1.312 },
  { ano: 2025, mes: 9, precoKgAtr: 1.2784 },
];

function colheita(over: Partial<ColheitaComReceita> = {}): ColheitaComReceita {
  return {
    id: "c1",
    fazendaId: "f1",
    fazendaNome: "Fazenda Boa Vista",
    usinaId: "u1",
    usinaNome: "Coruripe",
    safra: "2025/26",
    anoMoagem: 2025,
    mesMoagem: 9,
    toneladas: 1000,
    receitaBruta: 145852,
    ...over,
  };
}

/* ---------- ordenação e filtragem ---------- */

test("mesesComAtr descarta ATR ausente, zero e negativo", () => {
  const serie: MesAtr[] = [
    { ano: 2025, mes: 9, precoKgAtr: 1.2784 },
    { ano: 2025, mes: 7, precoKgAtr: 0 },
    { ano: 2025, mes: 8, precoKgAtr: 1.312 },
    { ano: 2025, mes: 10, precoKgAtr: -1 },
    { ano: 2025, mes: 11, precoKgAtr: NaN },
  ];
  const out = mesesComAtr(serie);
  assert.equal(out.length, 2);
  assert.deepEqual(out.map((m) => m.mes), [8, 9]);
});

test("rotuloMes usa a sigla curta com ano de 2 dígitos", () => {
  assert.equal(rotuloMes(2025, 8), "Ago/25");
  assert.equal(rotuloMes(2025, 12), "Dez/25");
});

/* ---------- o mês simulado é sempre o seguinte ---------- */

test("proximoMesAtr com ago e set simula outubro", () => {
  const alvo = proximoMesAtr(atrs);
  assert.ok(alvo);
  assert.equal(alvo.mes, 10);
  assert.equal(alvo.ano, 2025);
  assert.equal(alvo.rotulo, "Out/25");
});

test("proximoMesAtr de dez a dez simula janeiro do ano seguinte", () => {
  const serie: MesAtr[] = [
    { ano: 2025, mes: 8, precoKgAtr: 1.312 },
    { ano: 2025, mes: 9, precoKgAtr: 1.2784 },
    { ano: 2025, mes: 10, precoKgAtr: 1.27 },
    { ano: 2025, mes: 11, precoKgAtr: 1.26 },
    { ano: 2025, mes: 12, precoKgAtr: 1.25 },
  ];
  const alvo = proximoMesAtr(serie);
  assert.ok(alvo);
  assert.equal(alvo.mes, 1);
  assert.equal(alvo.ano, 2026);
  assert.equal(alvo.rotulo, "Jan/26");
});

test("proximoMesAtr devolve null sem nenhum ATR", () => {
  assert.equal(proximoMesAtr([]), null);
  assert.equal(ultimoMesAtr([]), null);
});

/* ---------- a proporção ---------- */

test("valorNoMes aplica a razão do ATR", () => {
  // 145.852 × (1,3120 ÷ 1,2784) = 149.685,41
  assert.equal(perto(valorNoMes(145852, 1.2784, 1.312), 145852 * (1.312 / 1.2784)), true);
  assert.equal(perto(valorNoMes(1000, 1, 1.5), 1500), true);
  // Conferência legível: 1.000 t a 1,2784, reavaliadas a 1,3120, dão ~R$ 1.026,28.
  assert.equal(Math.abs(valorNoMes(1000, 1.2784, 1.312) - 1026.28) < 0.01, true);
});

test("valorNoMes devolve 0 quando a ATR base é zero — evita NaN", () => {
  assert.equal(valorNoMes(145852, 0, 1.3), 0);
  assert.equal(valorNoMes(145852, -1, 1.3), 0);
});

/* ---------- agrupamento por fazenda e mês ---------- */

test("agruparPorMoinada soma as colheitas da mesma fazenda no mesmo mês", () => {
  const grupos = agruparPorMoinada([
    colheita({ id: "c1", toneladas: 1000, receitaBruta: 100000 }),
    colheita({ id: "c2", toneladas: 500, receitaBruta: 60000 }),
  ]);
  assert.equal(grupos.length, 1);
  assert.equal(grupos[0].toneladas, 1500);
  assert.equal(perto(grupos[0].receitaReal, 160000), true);
  assert.equal(grupos[0].qtdColheitas, 2);
});

test("agruparPorMoinada separa a mesma fazenda em meses diferentes", () => {
  const grupos = agruparPorMoinada([
    colheita({ id: "c1", anoMoagem: 2025, mesMoagem: 8 }),
    colheita({ id: "c2", anoMoagem: 2025, mesMoagem: 9 }),
  ]);
  assert.equal(grupos.length, 2);
  assert.equal(grupos[0].rotulo, "Ago/25");
  assert.equal(grupos[1].rotulo, "Set/25");
});

test("agruparPorMoinada separa fazendas diferentes no mesmo mês", () => {
  const grupos = agruparPorMoinada([
    colheita({ id: "c1", fazendaId: "f1", fazendaNome: "Boa Vista" }),
    colheita({ id: "c2", fazendaId: "f2", fazendaNome: "Santa Ana" }),
  ]);
  assert.equal(grupos.length, 2);
  assert.equal(grupos[0].fazendaNome, "Boa Vista");
  assert.equal(grupos[1].fazendaNome, "Santa Ana");
});

test("agruparPorMoinada ignora tonnes negativas e receita não finita", () => {
  const grupos = agruparPorMoinada([
    colheita({ id: "c1", toneladas: -50, receitaBruta: NaN }),
    colheita({ id: "c2", toneladas: 100, receitaBruta: 1000 }),
  ]);
  assert.equal(grupos.length, 1);
  assert.equal(grupos[0].toneladas, 100);
  assert.equal(perto(grupos[0].receitaReal, 1000), true);
});

/* ---------- comparativo real ---------- */

test("compararAtrReal reavalia a moagem pelo ATR de cada mês", () => {
  const [grupo] = agruparPorMoinada([colheita()]);
  const c = compararAtrReal(grupo, atrs);

  assert.equal(c.semAtrNoMesReal, false);
  assert.equal(c.linhas.length, 2);

  const [ago, set] = c.linhas;
  assert.equal(ago.rotulo, "Ago/25");
  assert.equal(ago.ehReal, false);
  assert.equal(perto(ago.atr, 1.312), true);
  assert.equal(perto(ago.valor, 145852 * (1.312 / 1.2784)), true);
  // Ago pagou mais: a diferença contra o real é positiva.
  assert.equal(ago.diferenca > 0, true);

  assert.equal(set.ehReal, true);
  // No mês real o valor é exatamente o bruto recebido.
  assert.equal(perto(set.valor, 145852), true);
  assert.equal(perto(set.diferenca, 0), true);
});

test("compararAtrReal destaca o melhor e o pior mês", () => {
  const [grupo] = agruparPorMoinada([colheita()]);
  const c = compararAtrReal(grupo, atrs);
  assert.equal(c.melhor?.rotulo, "Ago/25");
  assert.equal(c.pior?.rotulo, "Set/25");
  assert.equal(c.perdaVsMelhor > 0, true);
});

test("compararAtrReal avisa quando a usina não anunciou o ATR do mês real", () => {
  const [grupo] = agruparPorMoinada([colheita({ anoMoagem: 2025, mesMoagem: 7 })]);
  const c = compararAtrReal(grupo, atrs);
  assert.equal(c.semAtrNoMesReal, true);
  assert.equal(c.linhas.every((l) => l.valor === 0 && l.diferenca === 0), true);
  assert.equal(c.melhor, null);
  assert.equal(perto(c.perdaVsMelhor, 0), true);
});

test("compararAtrReal com um único mês cadastrado não inventa comparação", () => {
  const soSet: MesAtr[] = [{ ano: 2025, mes: 9, precoKgAtr: 1.2784 }];
  const [grupo] = agruparPorMoinada([colheita()]);
  const c = compararAtrReal(grupo, soSet);
  assert.equal(c.linhas.length, 1);
  assert.equal(c.linhas[0].ehReal, true);
  assert.equal(perto(c.linhas[0].valor, 145852), true);
  assert.equal(perto(c.perdaVsMelhor, 0), true);
});

/* ---------- simulação do próximo mês ---------- */

test("simularProximoMed — 1,2681 dá perda na fazenda já colhida", () => {
  const grupos = agruparPorMoinada([colheita()]);
  const p = simularProximoMes(grupos, atrs, 1.2681);

  assert.equal(p.mes?.rotulo, "Out/25");
  assert.equal(p.linhas.length, 1);

  const linha = p.linhas[0];
  assert.equal(linha.grupo.fazendaNome, "Fazenda Boa Vista");
  assert.equal(perto(linha.receitaPrevista, 145852 * (1.2681 / 1.2784)), true);
  assert.equal(linha.perda, true);
  assert.equal(linha.diferenca < 0, true);
  assert.equal(perto(p.totalDiferenca, linha.diferenca), true);
});

test("simularProximoMes com ATR acima do real dá ganho", () => {
  const grupos = agruparPorMoinada([colheita()]);
  const p = simularProximoMes(grupos, atrs, 1.3);
  assert.equal(p.linhas[0].perda, false);
  assert.equal(p.linhas[0].diferenca > 0, true);
});

test("simularProximoMes com o mesmo ATR do mês real dá diferença zero", () => {
  const grupos = agruparPorMoinada([colheita()]);
  const p = simularProximoMes(grupos, atrs, 1.2784);
  assert.equal(perto(p.linhas[0].diferenca, 0), true);
  assert.equal(perto(p.totalDiferenca, 0), true);
});

test("simularProximoMes ordena do pior para o melhor efeito", () => {
  const grupos = agruparPorMoinada([
    colheita({ id: "c1", fazendaId: "f1", fazendaNome: "Boa Vista", mesMoagem: 9, receitaBruta: 200000 }),
    colheita({ id: "c2", fazendaId: "f2", fazendaNome: "Santa Ana", mesMoagem: 9, receitaBruta: 50000 }),
  ]);
  const p = simularProximoMes(grupos, atrs, 1.2681);
  // Pior efeito primeiro: Boa Vista, que tem o maior valor em risco.
  assert.equal(p.linhas[0].grupo.fazendaNome, "Boa Vista");
  assert.equal(p.linhas[1].grupo.fazendaNome, "Santa Ana");
});

test("simularProximoMes conta as fazendas sem ATR no mês real", () => {
  const grupos = agruparPorMoinada([
    colheita({ id: "c1", mesMoagem: 9 }),
    colheita({ id: "c2", fazendaId: "f2", mesMoagem: 7 }),
  ]);
  const p = simularProximoMes(grupos, atrs, 1.2681);
  assert.equal(p.linhas.length, 1);
  assert.equal(p.semBase, 1);
});

test("simularProximoMes sem ATR cadastrado não simula nada", () => {
  const grupos = agruparPorMoinada([colheita()]);
  const p = simularProximoMes(grupos, [], 1.2681);
  assert.equal(p.mes, null);
  assert.equal(p.linhas.length, 0);
  assert.equal(perto(p.totalDiferenca, 0), true);
});

test("simularMes simula qualquer mês da safra cadastrado", () => {
  const grupos = agruparPorMoinada([colheita()]);
  // Colheita moeu em Set/25 (ATR 1,2784). Simular que Set/25 tivesse o ATR de Ago (1,3120).
  const p = simularMes(grupos, atrs, { ano: 2025, mes: 8, rotulo: "Ago/25" }, 1.312);

  assert.equal(p.mes?.rotulo, "Ago/25");
  assert.equal(p.linhas.length, 1);
  const linha = p.linhas[0];
  assert.equal(perto(linha.receitaPrevista, 145852 * (1.312 / 1.2784)), true);
  assert.equal(linha.perda, false);
  assert.equal(linha.diferenca > 0, true);
});

test("simularMes com alvo nulo não simula nada", () => {
  const grupos = agruparPorMoinada([colheita()]);
  const p = simularMes(grupos, atrs, null, 1.2681);
  assert.equal(p.mes, null);
  assert.equal(p.linhas.length, 0);
});

/* ---------- séries dos gráficos ---------- */

test("serieAtrComparativo soma todas as moagens em cada mês", () => {
  const grupos = agruparPorMoinada([
    colheita({ id: "c1", mesMoagem: 9, receitaBruta: 100000 }),
    colheita({ id: "c2", mesMoagem: 8, receitaBruta: 100000 }),
  ]);
  const serie = serieAtrComparativo(grupos, atrs);

  assert.equal(serie.length, 2);
  assert.equal(serie[0].rotulo, "Ago/25");
  assert.equal(perto(serie[0].atr, 1.312), true);
  // No ATR de agosto: a moagem de agosto vale 100.000 e a de setembro,
  // reavaliada, vale 100.000 × (1,3120 ÷ 1,2784).
  assert.equal(perto(serie[0].valor, 100000 + 100000 * (1.312 / 1.2784)), true);
  assert.equal(serie.every((s) => s.ehReal), true);
});

test("serieAtrComparativo marca como real só o mês que teve moagem", () => {
  const grupos = agruparPorMoinada([colheita({ mesMoagem: 9 })]);
  const serie = serieAtrComparativo(grupos, atrs);
  assert.equal(serie[0].ehReal, false);
  assert.equal(serie[1].ehReal, true);
});

test("serieAtrComparativo devolve série vazia sem ATR", () => {
  assert.deepEqual(serieAtrComparativo([], []), []);
});

test("serieAtrMensal lista o ATR anunciado mês a mês", () => {
  const serie = serieAtrMensal(atrs);
  assert.deepEqual(serie, [
    { rotulo: "Ago/25", atr: 1.312 },
    { rotulo: "Set/25", atr: 1.2784 },
  ]);
});

test("acharAtr acha o mês e devolve null quando não existe", () => {
  assert.equal(acharAtr(atrs, 2025, 8), 1.312);
  assert.equal(acharAtr(atrs, 2025, 7), null);
});
