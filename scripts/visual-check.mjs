import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.BASE_URL || "http://localhost:3210";
const OUT = join(fileURLToPath(new URL(".", import.meta.url)), "..", ".checks");

const VIEWPORTS = [
  { nome: "mobile-390", width: 390, height: 844 },
  { nome: "desktop-1440", width: 1440, height: 900 },
];

const ROTAS = [
  { url: "/", nome: "dashboard" },
  { url: "/fazendas", nome: "fazendas" },
  { url: "/fazendas/nova", nome: "fazenda-nova" },
  { url: "/colheitas", nome: "colheitas" },
  { url: "/colheitas/nova", nome: "colheita-nova" },
  { url: "/usinas", nome: "usinas" },
  { url: "/relatorios", nome: "relatorios" },
];

const problemas = [];
const relatorio = [];

async function autenticar(page) {
  const email = `ui-${Date.now()}-${Math.random().toString().slice(2, 8)}@teste.local`;
  await page.goto(`${BASE}/registro`, { waitUntil: "networkidle", timeout: 30000 });
  await page.fill('input[name="nome"]', "Usuário Teste");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "Teste12345");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/login/, { timeout: 30000 });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "Teste12345");
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => u.pathname === "/", { timeout: 30000 });
}

async function checarPagina(page, rota, viewport) {
  const errosLog = [];
  const errosPagina = [];
  const reqFailed = [];

  const onConsole = (m) => {
    if (m.type() === "error") errosLog.push(m.text());
  };
  const onPageError = (e) => errosPagina.push(String(e));
  const onReqFailed = (r) => reqFailed.push(`${r.method()} ${r.url()}`);

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("requestfailed", onReqFailed);

  await page.goto(`${BASE}${rota.url}`, { waitUntil: "networkidle", timeout: 30000 });

  await page.waitForTimeout(400);

  const medidas = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      larguraJanela: window.innerWidth,
      scrollWidth: doc.scrollWidth,
      overflowX: doc.scrollWidth > window.innerWidth + 1,
      notaMeta: document.querySelector('meta[name="viewport"]')?.content ?? null,
    };
  });

  const navMobileVisivel = await page
    .locator('nav[aria-label="Navegação inferior"]')
    .isVisible()
    .catch(() => false);
  const navDesktopVisivel = await page
    .locator('nav[aria-label="Navegação principal"]')
    .isVisible()
    .catch(() => false);

  const diretorio = join(OUT, viewport.nome);
  mkdirSync(diretorio, { recursive: true });
  await page.screenshot({
    path: join(diretorio, `${rota.nome}.png`),
    fullPage: true,
  });

  await page.removeListener("console", onConsole);
  await page.removeListener("pageerror", onPageError);
  await page.removeListener("requestfailed", onReqFailed);

  const temProblema =
    medidas.overflowX || errosLog.length > 0 || errosPagina.length > 0;

  if (temProblema) {
    problemas.push({
      viewport: viewport.nome,
      rota: rota.nome,
      overflowX: medidas.overflowX,
      errosLog: errosLog.slice(0, 5),
      errosPagina: errosPagina.slice(0, 5),
    });
  }

  relatorio.push({
    viewport: viewport.nome,
    rota: rota.nome,
    statusOk: true,
    overflowX: medidas.overflowX,
    navMobile: navMobileVisivel,
    navDesktop: navDesktopVisivel,
    errosConsole: errosLog.length,
    falhasRede: reqFailed.length,
  });
}

async function testarNavegacao(page) {
  const passos = [];
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 30000 });

  if ((await page.locator('nav[aria-label="Navegação inferior"]').isVisible().catch(() => false))) {
    await page.locator('nav[aria-label="Navegação inferior"] a:has-text("Colheitas")').click();
    await page.waitForURL("**/colheitas");
    passos.push("mobile: bottom-nav -> /colheitas ok");
  } else {
    await page.locator('nav[aria-label="Navegação principal"] a:has-text("Fazendas")').click();
    await page.waitForURL("**/fazendas");
    passos.push("desktop: header-nav -> /fazendas ok");
  }

  const titulo = await page.locator("h1").first().textContent().catch(() => null);
  return { ok: titulo !== null, passos, titulo };
}

(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });

  try {
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
        locale: "pt-BR",
      });
      const page = await ctx.newPage();
      await autenticar(page);

      for (const rota of ROTAS) {
        await checarPagina(page, rota, vp);
      }

      const nav = await testarNavegacao(page);
      relatorio.push({ viewport: vp.nome, rota: "(navegação)", nav });

      await ctx.close();
    }
  } finally {
    await browser.close();
  }

  console.log("\n===== RELATÓRIO DE LAYOUT =====");
  for (const r of relatorio) {
    if (r.nav) {
      console.log(`[${r.viewport}] navegação -> ${r.nav.ok ? "OK" : "FALHOU"} (${r.nav.passos.join("; ")})`);
      continue;
    }
    const status = r.statusOk && !r.overflowX ? "OK" : "PROBLEMA";
    console.log(
      `[${r.viewport}] ${r.rota.padEnd(16)} ${status}  overflow=${r.overflowX}  consoleErros=${r.errosConsole}  navMobile=${r.navMobile}  navDesktop=${r.navDesktop}`,
    );
  }

  if (problemas.length > 0) {
    console.log("\n===== PROBLEMAS =====");
    for (const p of problemas) {
      console.log(`> ${p.viewport} ${p.rota}  overflowX=${p.overflowX}`);
      if (p.errosLog.length) console.log("   console:", p.errosLog.join(" | "));
      if (p.errosPagina.length) console.log("   pageerror:", p.errosPagina.join(" | "));
    }
    console.log(`\nScreenshots em: ${OUT}`);
    process.exitCode = 1;
  } else {
    console.log("\nNenhum problema de layout/console encontrado.");
    console.log(`Screenshots em: ${OUT}`);
  }
})();