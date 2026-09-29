import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:3210";
const ts = Date.now().toString().slice(-6);
const NOME_FAZENDA = `Fazenda E2E ${ts}`;
const NOME_TALHAO = `T-E2E${ts}`;
const NOME_USINA = `Usina E2E ${ts}`;

const naoEhNovo = (u) =>
  /\/talhoes\/[a-z0-9-]+$/.test(u.pathname) && !u.pathname.endsWith("/novo");

(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "pt-BR" });
  const page = await ctx.newPage();
  const passos = [];
  const falha = (msg) => { throw new Error(msg); };

  try {
    passos.push("0. Registrar e entrar");
    const email = `e2e-${ts}@teste.local`;
    await page.goto(`${BASE}/registro`, { waitUntil: "networkidle" });
    await page.fill('input[name="nome"]', "Usuario E2E");
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', "Teste12345");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/login/, { timeout: 20000 });
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', "Teste12345");
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => u.pathname === "/", { timeout: 20000 });
    passos.push("Autenticado (dashboard)");

    passos.push("0d. Navegação mobile: Mais → Simulador");
    await page.getByRole("button", { name: "Mais módulos" }).click();
    const painel = page.getByRole("dialog", { name: "Todos os módulos" });
    await painel.waitFor({ timeout: 10000 });
    await painel.getByRole("link", { name: "Simulador" }).click();
    await page.waitForURL("**/simulador", { timeout: 15000 });
    await page.getByRole("heading", { name: "Simulador de decisão" }).waitFor({ timeout: 15000 });
    if (await painel.isVisible().catch(() => false)) falha("Painel Mais não fechou após navegar");
    for (const [nome, url, titulo] of [
      ["Análise por talhão", "**/analise-talhoes", "Análise por talhão"],
      ["Calculadoras", "**/calculadoras", "Calculadoras"],
    ]) {
      await page.getByRole("button", { name: "Mais módulos" }).click();
      await page.getByRole("dialog", { name: "Todos os módulos" }).getByRole("link", { name: nome }).click();
      await page.waitForURL(url, { timeout: 15000 });
      await page.getByRole("heading", { name: titulo }).waitFor({ timeout: 15000 });
    }
    passos.push("Painel Mais navega e fecha (Simulador, Análise, Calculadoras)");

    passos.push("0e. Navegação desktop: menu lateral com todos os módulos");
    const ctxDesktop = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: "pt-BR",
      storageState: await ctx.storageState(),
    });
    const desktop = await ctxDesktop.newPage();
    await desktop.goto(`${BASE}/`, { waitUntil: "networkidle" });
    const menu = desktop.getByRole("navigation", { name: "Navegação principal" });
    for (const nome of ["Início", "Fazendas", "Usinas", "Colheitas", "Plantio", "Tratos", "Financeiro", "Relatórios", "Simulador", "Análise por talhão", "Calculadoras"]) {
      await menu.getByRole("link", { name: nome }).waitFor({ timeout: 10000 });
    }
    await menu.getByRole("link", { name: "Simulador" }).click();
    await desktop.waitForURL("**/simulador", { timeout: 15000 });
    await desktop.getByRole("heading", { name: "Simulador de decisão" }).waitFor({ timeout: 15000 });
    await ctxDesktop.close();
    passos.push("Menu lateral mostra os 11 módulos e navega");

    passos.push("1. Nova usina (CRUD)");
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
    await page.getByText(/29,9 ha|29,94 ha/).first().waitFor({ timeout: 15000 });
    await page.getByText(/99 tarefas/).first().waitFor({ timeout: 15000 });
    passos.push("Talhão criado (99 tarefas = 29,94 ha com 3,3058 tarefas/ha), página de detalhe aberta");

    passos.push("3a. Plantio com porções");
    await page.goto(`${BASE}/plantio/nova`, { waitUntil: "networkidle" });
    await page.selectOption('select[name="fazendaId"]', { label: NOME_FAZENDA });
    await page.selectOption('select[name="escopo"]', "talhao");
    await page.selectOption("select[id$='-escolher']", {
      label: `${NOME_TALHAO} · 99 tarefas`,
    });
    await page.getByRole("button", { name: "Talhão todo" }).click();
    await page.getByText(/Todo o talhão/).first().waitFor({ timeout: 10000 });
    await page.getByText(/99,00 tarefas/).first().waitFor({ timeout: 10000 });
    await page.fill('input[name="valor"]', "166000");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/plantio", { timeout: 20000 });
    const linhaPlantio = page.locator("li").filter({ hasText: NOME_TALHAO });
    await linhaPlantio.waitFor({ timeout: 15000 });
    if ((await linhaPlantio.filter({ hasText: "parte" }).count()) > 0)
      falha("Talhão inteiro marcado como parte");
    passos.push("Plantio salvo com talhão inteiro (sem marcação de parte)");

    passos.push("3b. Trato com parte do talhão");
    await page.goto(`${BASE}/tratos/nova`, { waitUntil: "networkidle" });
    await page.selectOption('select[name="fazendaId"]', { label: NOME_FAZENDA });
    await page.selectOption('select[name="escopo"]', "talhao");
    await page.selectOption("select[id$='-escolher']", {
      label: `${NOME_TALHAO} · 99 tarefas`,
    });
    await page.getByRole("button", { name: "Só uma parte" }).click();
    await page.fill('input[placeholder="0"]', "40");
    await page.waitForTimeout(500);
    await page.fill('input[name="valor"]', "20000");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/tratos", { timeout: 20000 });
    const linhaTrato = page.locator("li").filter({ hasText: NOME_TALHAO });
    await linhaTrato.waitFor({ timeout: 15000 });
    await linhaTrato.getByText(/\(parte\)/).first().waitFor({ timeout: 10000 });
    passos.push("Trato salvo como parte do talhão (40 tarefas) e exibido na lista");

    passos.push("3c. Editar plantio preserva as porções");
    await page.goto(`${BASE}/plantio`, { waitUntil: "networkidle" });
    await page
      .locator("li")
      .filter({ hasText: NOME_TALHAO })
      .locator('a[aria-label="Editar plantio"]')
      .click();
    await page.waitForURL(/\/plantio\/[a-z0-9-]+\/editar$/, { timeout: 15000 });
    await page.getByText(/Todo o talhão/).first().waitFor({ timeout: 10000 });
    await page.getByText(/99,00 tarefas/).first().waitFor({ timeout: 10000 });
    await page.click('button[type="submit"]');
    await page.waitForURL("**/plantio", { timeout: 20000 });
    const linhaDepois = page.locator("li").filter({ hasText: NOME_TALHAO });
    await linhaDepois.waitFor({ timeout: 15000 });
    if ((await linhaDepois.filter({ hasText: "parte" }).count()) > 0)
      falha("Edição perdeu a marcação de talhão inteiro");
    passos.push("Edição do plantio preservou a porção");

    passos.push("4. Registrar colheita");
    await page.goto(`${BASE}/usinas/nova`, { waitUntil: "networkidle" });
    await page.fill('input[name="nome"]', "Usina Pindorama");
    await page.selectOption('select[name="modelo"]', "pindorama");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/usinas", { timeout: 20000 });
    passos.push("4a. Usina Pindorama (re)criada");
    await page.goto(`${BASE}/colheitas/nova`, { waitUntil: "networkidle" });
    await page.selectOption('select[name="fazendaId"]', { label: NOME_FAZENDA });
    await page.selectOption('select[name="usinaId"]', { label: "Usina Pindorama (Pindorama)" });
    await page.fill('input[name="toneladas"]', "9.876,5");
    await page.fill('input[name="precoCana"]', "164,00");
    await page.fill('input[name="ctc"]', "12.000,00");
    const seccionDesp = page.locator("section").filter({ hasText: "Despesas com a usina" });
    await seccionDesp.getByRole("button", { name: "+ Adicionar item" }).click();
    await seccionDesp.locator('input[placeholder^="Nome"]').fill("Plantio");
    await seccionDesp.locator('input[placeholder="Valor R$"]').fill("166.000");
    await page.fill('textarea[name="observacao"]', "teste e2e");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/colheitas\/[a-z0-9-]+$/, { timeout: 20000 });
    await page.getByText(/9\.876,5/).first().waitFor({ timeout: 15000 });
    await page.getByText(/Pindorama/).first().waitFor({ timeout: 15000 });
    await page.locator("dt").getByText("Plantio").first().waitFor({ timeout: 15000 });
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