import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3210";
const ts = Date.now().toString().slice(-6);
const NOME_FAZENDA = `Fazenda E2E ${ts}`;
const NOME_TALHAO = `T-E2E${ts}`;
const NOME_USINA = `Usina E2E ${ts}`;
const TONELADAS = 9876.5;

const naoEhNovo = (u) =>
  /\/talhoes\/[a-z0-9-]+$/.test(u.pathname) && !u.pathname.endsWith("/novo");

(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "pt-BR" });
  const page = await ctx.newPage();
  const passos = [];
  const falha = (msg) => { throw new Error(msg); };

  try {
    passos.push("0. Nova usina (CRUD)");
    await page.goto(`${BASE}/usinas/nova`, { waitUntil: "networkidle" });
    await page.fill('input[name="nome"]', NOME_USINA);
    await page.selectOption('select[name="modelo"]', "coruripe");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/usinas", { timeout: 20000 });
    await page.getByText(NOME_USINA, { exact: false }).first().waitFor({ timeout: 15000 });
    await page.getByText(/Coruripe/).first().waitFor({ timeout: 15000 });
    passos.push("Usina criada e visível na lista");

    passos.push("0b. Editar usina");
    const linhaUsina = page.locator("li").filter({ hasText: NOME_USINA });
    await linhaUsina.locator('a[aria-label="Editar usina"]').click();
    await page.waitForURL(/\/usinas\/[a-z0-9-]+\/editar$/, { timeout: 15000 });
    await page.selectOption('select[name="modelo"]', "pindorama");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/usinas", { timeout: 20000 });
    await page.getByText(/Pindorama/).first().waitFor({ timeout: 15000 });
    passos.push("Usina editada para Pindorama");

    passos.push("0c. Excluir usina");
    await page.locator("li").filter({ hasText: NOME_USINA }).locator('button[aria-label="Excluir"]').click();
    await page.getByRole("dialog").getByRole("button", { name: "Excluir" }).click();
    await page.getByText(NOME_USINA, { exact: false }).first().waitFor({ state: "detached", timeout: 15000 });
    passos.push("Usina excluída");

    passos.push("1. Nova fazenda");
    await page.goto(`${BASE}/fazendas/nova`, { waitUntil: "networkidle" });
    await page.fill('input[name="nome"]', NOME_FAZENDA);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/fazendas", { timeout: 20000 });
    await page.getByText(NOME_FAZENDA, { exact: false }).first().waitFor({ timeout: 15000 });
    passos.push("Fazenda criada e visível na lista");

    passos.push("2. Abrir detalhe da fazenda");
    await page.getByRole("link", { name: new RegExp(NOME_FAZENDA) }).first().click();
    await page.waitForURL(/\/fazendas\/[a-z0-9-]+$/, { timeout: 15000 });
    passos.push("Detalhe aberto");

    passos.push("3. Criar talhão");
    await page.getByRole("link", { name: /Novo talhão/ }).click();
    await page.waitForURL("**/talhoes/novo", { timeout: 15000 });
    await page.fill('input[name="nome"]', NOME_TALHAO);
    await page.fill('input[name="area"]', "99");
    await page.selectOption('select[name="unidade"]', "tarefas");
    await page.click('button[type="submit"]');
    await page.waitForURL(naoEhNovo, { timeout: 20000 });
    await page.getByRole("heading", { name: NOME_TALHAO }).waitFor({ timeout: 15000 });
    await page.getByText(/30 ha/).first().waitFor({ timeout: 15000 });
    await page.getByText(/99 tarefas/).first().waitFor({ timeout: 15000 });
    passos.push("Talhão criado (99 tarefas = 30 ha), página de detalhe aberta");

    passos.push("4. Registrar colheita");
    await page.goto(`${BASE}/colheitas/nova`, { waitUntil: "networkidle" });
    await page.selectOption('select[name="fazendaId"]', { label: NOME_FAZENDA });
    await page.selectOption('select[name="usinaId"]', { label: "Usina Pindorama (Pindorama)" });
    await page.fill('input[name="toneladas"]', String(TONELADAS).replace(".", ","));
    await page.fill('input[name="precoCana"]', "164,00");
    await page.fill('input[name="ctc"]', "12.000,00");
    const seccionDesp = page.locator("section").filter({ hasText: "Despesas com a usina" });
    await seccionDesp.getByRole("button", { name: "+ Adicionar item" }).click();
    await seccionDesp.locator('input[placeholder^="Nome"]').fill("Plantio");
    await seccionDesp.locator('input[placeholder="Valor R$"]').fill("166000");
    await page.fill('textarea[name="observacao"]', "teste e2e");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/colheitas\/[a-z0-9-]+$/, { timeout: 20000 });
    await page.getByText(/9\.876,5/).first().waitFor({ timeout: 15000 });
    await page.getByText(/Pindorama/).first().waitFor({ timeout: 15000 });
    await page.getByText(/Plantio/).first().waitFor({ timeout: 15000 });
    await page.getByText(/166\.000,00/).first().waitFor({ timeout: 15000 });
    passos.push("Colheita registrada (detalhe aberto, despesa Plantio salva)");

    passos.push("5. Confirmar na lista de colheitas");
    await page.goto(`${BASE}/colheitas`, { waitUntil: "networkidle" });
    const linha = page.locator("li").filter({ hasText: "9.876,5" }).filter({ hasText: NOME_FAZENDA });
    await linha.waitFor({ timeout: 15000 });
    passos.push("Colheita na lista com fazenda e toneladas");

    passos.push("6. Excluir colheita");
    await linha.locator('button[aria-label="Excluir"]').click();
    await page.getByRole("dialog").getByRole("button", { name: "Excluir" }).click();
    await linha.waitFor({ state: "detached", timeout: 15000 });
    passos.push("Colheita excluída");

    passos.push("7. Excluir talhão");
    await page.goto(`${BASE}/fazendas`, { waitUntil: "networkidle" });
    await page.getByRole("link", { name: new RegExp(NOME_FAZENDA) }).first().click();
    await page.waitForURL(/\/fazendas\/[a-z0-9-]+$/, { timeout: 15000 });
    await page.getByRole("link", { name: new RegExp(NOME_TALHAO) }).first().click();
    await page.waitForURL(naoEhNovo, { timeout: 15000 });
    await page.locator('button[aria-label="Excluir"]').click();
    await page.getByRole("dialog").getByRole("button", { name: "Excluir" }).click();
    await page.waitForURL(/\/fazendas\/[a-z0-9-]+$/, { timeout: 20000 });
    passos.push("Talhão excluído, voltou ao detalhe da fazenda");

    passos.push("8. Excluir fazenda");
    await page.locator('button[aria-label="Excluir"]').click();
    await page.getByRole("dialog").getByRole("button", { name: "Excluir" }).click();
    await page.waitForURL("**/fazendas", { timeout: 20000 });
    const resto = await page.getByText(NOME_FAZENDA, { exact: false }).count();
    if (resto > 0) falha("Fazenda ainda aparece após exclusão");
    passos.push("Fazenda excluída, lista limpa");

    console.log("E2E OK — " + passos.join(" | "));
  } catch (e) {
    console.log("E2E FALHOU — " + passos.join(" | "));
    console.log("Erro: " + e.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();