import { abrirEditor, expect, expectAccessible, test } from "./fixtures";
import type { Page } from "@playwright/test";

async function salvar(page: Page, nome: string, os = "", cliente = "") {
  await page.getByRole("button", { name: /Salvar (faca|alterações)/ }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Nome").fill(nome);
  if (os) await d.getByLabel("Nº da O.S.").fill(os);
  if (cliente) await d.getByLabel("Cliente").fill(cliente);
  await d.getByRole("button", { name: "Salvar", exact: true }).click();
}

test.describe("F03 — salvar, reabrir, buscar, excluir", () => {
  test("F03-H1/H2/H3 salvar, achar na lista, reabrir e editar", async ({ page }) => {
    await abrirEditor(page, ["70", "150", "40"]);
    await salvar(page, "Caixa vela 300 ml", "48300", "Velas Aurora");
    await expect(page).toHaveURL(/\?d=/);
    await expect(page.getByRole("heading", { name: "Caixa vela 300 ml" })).toBeVisible();

    await page.goto("/facas");
    await expectAccessible(page, "/facas");
    await page.getByRole("link", { name: "Caixa vela 300 ml" }).click();
    await expect(page.getByLabel(/^Largura/)).toHaveValue("70");
    await expect(page.getByLabel(/^Profundidade/)).toHaveValue("40");

    await page.getByLabel(/^Largura/).fill("75");
    await salvar(page, "Caixa vela 300 ml");
    await expect(page.getByText("Faca atualizada", { exact: true })).toBeVisible();
    await page.goto("/facas");
    await expect(page.getByRole("row", { name: /Caixa vela 300 ml/ })).toContainText("75 × 150 × 40");
  });

  test("F03-E1/E3 acentos e emoji; busca sem acento", async ({ page }) => {
    await abrirEditor(page, ["60", "100", "30"]);
    await salvar(page, "Caixa açaí 🍇");
    await expect(page.getByRole("heading", { name: "Caixa açaí 🍇" })).toBeVisible();
    await page.goto("/facas");
    await page.getByLabel("Buscar por nome, O.S. ou cliente").fill("acai");
    await expect(page.getByRole("link", { name: "Caixa açaí 🍇" })).toBeVisible();
  });

  test("F03-E2 nome de 120 caracteres não estoura o layout", async ({ page }) => {
    const nome = "Caixa ".repeat(20).trim().slice(0, 120);
    await abrirEditor(page, ["60", "100", "30"]);
    await salvar(page, nome);
    await page.goto("/facas");
    await expect(page.getByRole("link", { name: nome })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
  });

  test("F03-E4 busca por O.S.", async ({ page }) => {
    await page.goto("/facas");
    await page.getByLabel("Buscar por nome, O.S. ou cliente").fill("48213");
    await expect(page.getByRole("link", { name: "Caixa vela 200 ml" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Sachê/ })).toHaveCount(0);
    await page.getByLabel("Buscar por nome, O.S. ou cliente").fill("zzzz");
    await expect(page.getByRole("cell", { name: /Nenhuma faca encontrada/ })).toBeVisible();
  });

  test("F03-E5 excluir numa aba e abrir na outra", async ({ page, context }) => {
    await page.goto("/facas");
    const href = await page.getByRole("link", { name: "Caixa vela 200 ml" }).getAttribute("href");
    const outra = await context.newPage();
    await page.getByRole("button", { name: "Excluir Caixa vela 200 ml" }).click();
    await expectAccessible(page, "diálogo excluir");
    await page.getByRole("dialog").getByRole("button", { name: "Excluir" }).click();
    await expect(page.getByRole("link", { name: "Caixa vela 200 ml" })).toHaveCount(0);
    await outra.goto(href!);
    await expect(outra.getByText("Faca não encontrada")).toBeVisible();
  });

  test("F03-E6/E7 nome vazio ou só espaços", async ({ page }) => {
    await abrirEditor(page, ["60", "100", "30"]);
    await page.getByRole("button", { name: "Salvar faca" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Nome").fill("");
    await d.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(d.getByText("Dê um nome para a faca.")).toBeVisible();
    await d.getByLabel("Nome").fill("    ");
    await d.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(d.getByText("Dê um nome para a faca.")).toBeVisible();
  });

  test("F03-N1 faca inexistente", async ({ page }) => {
    await page.goto("/criar/fundo-cartucho?d=nao-existe");
    await expect(page.getByText("Faca não encontrada")).toBeVisible();
  });

  test("F03-N2 O.S. limitada a 20 caracteres", async ({ page }) => {
    await abrirEditor(page, ["60", "100", "30"]);
    await page.getByRole("button", { name: "Salvar faca" }).click();
    const os = page.getByRole("dialog").getByLabel("Nº da O.S.");
    await os.fill("1".repeat(30));
    await expect(os).toHaveValue("1".repeat(20));
  });

  test("F03 @mobile lista de facas em 390 px", async ({ page }) => {
    await page.goto("/facas");
    await expect(page.getByRole("link", { name: "Caixa vela 200 ml" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await expectAccessible(page, "/facas mobile");
  });
});
