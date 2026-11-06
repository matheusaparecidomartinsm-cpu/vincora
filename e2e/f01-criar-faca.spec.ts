import { abrirEditor, expect, expectAccessible, exportar, test } from "./fixtures";

test.describe("F01 — criar e ver a faca", () => {
  test("F01-H1 catálogo → cartucho → medidas → faca na tela", async ({ page }) => {
    await page.goto("/");
    await expectAccessible(page, "S02 catálogo");
    await page.getByRole("link", { name: /Caixa fundo cartucho/ }).click();
    await expect(page).toHaveURL(/\/criar\/fundo-cartucho$/);
    await expect(page.getByRole("combobox", { name: "Material" })).toBeVisible();
    await page.getByLabel(/^Largura/).fill("70");
    await page.getByLabel(/^Altura/).fill("150");
    await page.getByLabel(/^Profundidade/).fill("40");
    await expect(page.getByRole("img", { name: /Faca aberta 236,2 por 271,4 milímetros/ })).toBeVisible();
    await expect(page.getByText("236,2 × 271,4 mm")).toBeVisible();
    await expect(page.getByText("A3", { exact: true })).toBeVisible();
    await expect(exportar(page)).toBeEnabled();
    await expectAccessible(page, "S06 preenchido");
  });

  test("F01-H2 colar 70x150x40 preenche os três campos", async ({ page }) => {
    await abrirEditor(page);
    await page.getByLabel(/^Largura/).focus();
    await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const dt = new DataTransfer();
      dt.setData("text", "70x150x40");
      el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
    });
    await expect(page.getByLabel(/^Largura/)).toHaveValue("70");
    await expect(page.getByLabel(/^Altura/)).toHaveValue("150");
    await expect(page.getByLabel(/^Profundidade/)).toHaveValue("40");
  });

  test("F01-E1 sem medidas: instrução, sem erro, exportar desabilitado", async ({ page }) => {
    await abrirEditor(page);
    await expect(page.getByText("Digite largura, altura e profundidade. A faca aparece aqui na hora.")).toBeVisible();
    await expect(page.getByText("Fora da regra")).toHaveCount(0);
    await expect(exportar(page)).toBeDisabled();
    await expectAccessible(page, "S06 vazio");
  });

  test("F01-E2 vírgula decimal (70,5 entra em 2 painéis: +1 mm)", async ({ page }) => {
    await abrirEditor(page, ["70,5", "150", "40"]);
    await expect(page.getByRole("img", { name: /Faca aberta 237,2 por/ })).toBeVisible();
    await expect(exportar(page)).toBeEnabled();
  });

  test("F01-E3 texto e emoji no campo não quebram a tela", async ({ page }) => {
    await abrirEditor(page, ["70", "150", "40"]);
    await page.getByLabel(/^Largura/).fill("7🙂0");
    await expect(exportar(page)).toBeDisabled();
    await page.getByLabel(/^Largura/).fill("abc");
    await expect(exportar(page)).toBeDisabled();
    await page.getByLabel(/^Largura/).fill("70");
    await expect(exportar(page)).toBeEnabled();
  });

  test("F01-E4 medidas enormes → aviso de plotter", async ({ page }) => {
    await abrirEditor(page, ["599", "599", "50"]);
    await expect(page.getByText("Plotter", { exact: true })).toBeVisible();
    await expect(page.getByText(/passa do A0/)).toBeVisible();
  });

  test("F01-E5 setas mudam 1, 10 e 0,1 mm", async ({ page }) => {
    await abrirEditor(page, ["70", "150", "40"]);
    const l = page.getByLabel(/^Largura/);
    await l.focus();
    await page.keyboard.press("ArrowUp");
    await expect(l).toHaveValue("71");
    await page.keyboard.press("Shift+ArrowUp");
    await expect(l).toHaveValue("81");
    await page.keyboard.press("Alt+ArrowDown");
    await expect(l).toHaveValue("80,9");
  });

  test("F01-E6 só teclado até o download", async ({ page }) => {
    await abrirEditor(page);
    await page.getByLabel(/^Largura/).focus();
    await page.keyboard.type("70");
    await page.keyboard.press("Tab");
    await page.keyboard.type("150");
    await page.keyboard.press("Tab");
    await page.keyboard.type("40");
    // anda com Tab até o botão Exportar (no máximo 15 tabs)
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press("Tab");
      const nome = await page.evaluate(() => document.activeElement?.textContent ?? "");
      if (nome.includes("Exportar")) break;
    }
    await expect(exportar(page)).toBeFocused();
    const dl = page.waitForEvent("download");
    await page.keyboard.press("Enter");
    expect((await dl).suggestedFilename()).toBe("faca-fundo-cartucho-70x150x40.zip");
  });

  test("F01-E8 trocar material muda a espessura e o tamanho", async ({ page }) => {
    await abrirEditor(page, ["70", "150", "40"]);
    await expect(page.getByText("0,345 mm")).toBeVisible();
    const antes = await page.getByRole("img", { name: /Faca aberta/ }).getAttribute("aria-label");
    await page.getByRole("combobox", { name: "Material" }).click();
    await page.getByRole("option", { name: /Triplex 350 g/ }).click();
    await expect(page.getByText("0,45 mm")).toBeVisible();
    const depois = await page.getByRole("img", { name: /Faca aberta/ }).getAttribute("aria-label");
    expect(depois).not.toBe(antes);
  });

  test("F01-E9 espessura fora do limite bloqueia exportar", async ({ page }) => {
    await abrirEditor(page, ["70", "150", "40"]);
    await page.getByRole("combobox", { name: "Material" }).click();
    await page.getByRole("option", { name: /Outro/ }).click();
    await page.getByLabel(/^Espessura do cartão/).fill("5");
    await expect(exportar(page)).toBeDisabled();
    await expect(page.getByText(/Espessura máxima 3 mm/)).toBeVisible();
  });

  test("F01-E10 [B-005] recarregar sem salvar restaura o rascunho; Limpar zera", async ({ page }) => {
    await abrirEditor(page, ["70", "150", "40"]);
    await page.reload();
    await expect(page.getByLabel(/^Largura/)).toHaveValue("70");
    await expect(page.getByLabel(/^Altura/)).toHaveValue("150");
    await expect(page.getByLabel(/^Profundidade/)).toHaveValue("40");
    await expect(page.getByText("Rascunho restaurado")).toBeVisible();
    await page.getByRole("button", { name: "Limpar rascunho" }).click();
    await expect(page.getByLabel(/^Largura/)).toHaveValue("");
    await page.reload();
    await expect(page.getByLabel(/^Largura/)).toHaveValue("");
  });

  test("F01-E11 [B-005] faca salva não vira rascunho de faca nova", async ({ page }) => {
    await page.goto("/criar/fundo-cartucho?d=d-1");
    await expect(page.getByRole("heading", { name: "Caixa vela 200 ml" })).toBeVisible();
    await page.goto("/criar/fundo-cartucho");
    await expect(page.getByRole("combobox", { name: "Material" })).toBeVisible();
    await expect(page.getByLabel(/^Largura/)).toHaveValue("");
  });

  test("F01-N1 profundidade acima de 50 mm", async ({ page }) => {
    await abrirEditor(page, ["70", "150", "40"]);
    await page.getByLabel(/^Profundidade/).fill("62");
    await expect(page.getByRole("alert").filter({ hasText: "No fundo cartucho a profundidade vai até 50 mm." })).toBeVisible();
    await expect(page.getByRole("img", { name: /mostrando a última faca válida/ })).toBeVisible();
    await expect(exportar(page)).toBeDisabled();
    await expectAccessible(page, "S06 erro");
  });

  test("F01-N2 modelo em desenvolvimento", async ({ page }) => {
    await page.goto("/criar/sacola");
    await expect(page.getByText("Sacola de papel ainda está em desenvolvimento")).toBeVisible();
    await page.getByRole("link", { name: "Ver modelos disponíveis" }).click();
    await expect(page).toHaveURL("/");
  });

  test("F01-N3 modelo inexistente", async ({ page }) => {
    const res = await page.goto("/criar/xyz");
    expect(res?.status()).toBeLessThan(500);
    await expect(page.getByText("Modelo não encontrado")).toBeVisible();
  });

  test("F01-E7 @mobile editor e catálogo em 390 px sem rolagem horizontal", async ({ page }) => {
    await page.goto("/");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await abrirEditor(page, ["70", "150", "40"]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await expect(exportar(page)).toBeVisible();
    await expectAccessible(page, "S06 mobile");
  });
});
