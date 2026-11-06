import { abrirEditor, expect, expectAccessible, test } from "./fixtures";

test.describe("F01 — caixa 3D", () => {
  test("F01-H3 aba Caixa 3D desenha a caixa e o controle de dobra funciona", async ({ page }) => {
    await abrirEditor(page, ["70", "150", "40"]);
    await page.getByRole("tab", { name: "Caixa 3D" }).click();
    const vista = page.getByRole("img", { name: /montada em 3D/ });
    await expect(vista).toBeVisible();
    await expect(page.getByText("Montando a caixa…")).toHaveCount(0, { timeout: 15000 });
    await expect(page.getByText(/não mostra 3D/)).toHaveCount(0);
    await expect(vista.locator("canvas")).toHaveCount(1);
    await page.waitForTimeout(300);
    await page.screenshot({ path: "../replica/clone-screens/S06-caixa-3d.png" });

    const dobra = page.getByLabel("Dobrar");
    await dobra.fill("30");
    await expect(page.getByText("30%")).toBeVisible();
    await page.waitForTimeout(200);
    await page.screenshot({ path: "../replica/clone-screens/S06-caixa-3d-30.png" });

    // teclado: foca a vista e gira
    await vista.focus();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("+");
    await page.getByRole("button", { name: "Reiniciar vista" }).click();
    await expectAccessible(page, "S06 caixa 3D");
  });

  test("F01-E12 sem medidas, a aba 3D pede as medidas", async ({ page }) => {
    await abrirEditor(page);
    await page.getByRole("tab", { name: "Caixa 3D" }).click();
    await expect(page.getByText("Digite as medidas para ver a caixa montada.")).toBeVisible();
  });

  test("F01-E13 @mobile caixa 3D em 390 px", async ({ page }) => {
    await abrirEditor(page, ["70", "150", "40"]);
    await page.getByRole("tab", { name: "Caixa 3D" }).click();
    await expect(page.getByText("Montando a caixa…")).toHaveCount(0, { timeout: 15000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});
