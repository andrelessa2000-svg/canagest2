import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "https://canagest2.vercel.app";
const ts = Date.now().toString().slice(-8);

(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage();
  page.on("response", async (r) => {
    try {
      const h = await r.headers();
      if (h["x-auth-debug"]) {
        console.log(`AUTH-DEBUG ${r.status()} ${r.url()} -> ${h["x-auth-debug"]}`);
      }
    } catch {}
    if (r.url().includes("/api/auth/callback")) {
      let status = "?", body = "";
      try { status = r.status(); } catch {}
      try { body = (await r.text()).slice(0, 200); } catch {}
      console.log(`AUTH RESP ${status} ${r.url()} body=${body}`);
    }
  });

  try {
    await page.goto(`${BASE}/registro`, { waitUntil: "load", timeout: 90000 });
    await page.fill('input[name="nome"]', "Usuario Produccion");
    await page.fill('input[name="email"]', `prod-${ts}@teste.local`);
    await page.fill('input[name="password"]', "Teste12345");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/login/, { timeout: 60000 });
    await page.fill('input[name="email"]', `prod-${ts}@teste.local`);
    await page.fill('input[name="password"]', "Teste12345");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(9000);
    console.log("FINAL URL:", page.url());
    console.log("COOKIES:", JSON.stringify(await page.context().cookies()));
  } catch (e) {
    console.log("ERROR:", e.message.slice(0, 300));
  } finally {
    await browser.close();
  }
})();