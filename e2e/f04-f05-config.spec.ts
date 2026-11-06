import { abrirEditor, expect, expectAccessible, test } from "./fixtures";

test.describe("F04 — materiais", () => {
  test("F04-H1/H3 cadastrar, usar no editor, arquivar", async ({ page }) => {
    await page.goto("/config/materiais");
    await expectAccessible(page, "materiais");
    await page.getByRole("button", { name: "Novo material" }).click();
    const d = page.getByRole("dialog");
    await expectAccessible(page, "diálogo material");
    await d.getByLabel("Nome").fill("Kraft 280 g");
    await d.getByLabel(/^Gramatura/).fill("280");
    await d.getByLabel(/^Espessura/).fill("0,38");
    await d.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.getByRole("cell", { name: "Kraft 280 g", exact: true })).toBeVisible();

    await abrirEditor(page);
    await page.getByRole("combobox", { name: "Material" }).click();
    await expect(page.getByRole("option", { name: /Kraft 280 g/ })).toBeVisible();
    await page.keyboard.press("Escape");

    await page.goto("/config/materiais");
    await page.getByRole("button", { name: "Arquivar Kraft 280 g" }).click();
    await expect(page.getByRole("cell", { name: /^Kraft 280 g/ })).toHaveCount(0);
    await page.getByRole("switch", { name: "Mostrar arquivados" }).click();
    await expect(page.getByRole("cell", { name: /^Kraft 280 g/ })).toBeVisible();

    await abrirEditor(page);
    await page.getByRole("combobox", { name: "Material" }).click();
    await expect(page.getByRole("option", { name: /Kraft 280 g/ })).toHaveCount(0);
  });

  test("F04-H2 editar espessura", async ({ page }) => {
    await page.goto("/config/materiais");
    await page.getByRole("button", { name: "Editar Duplex 250 g" }).click();
    await page.getByRole("dialog").getByLabel(/^Espessura/).fill("0,31");
    await page.getByRole("dialog").getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page.getByRole("row", { name: /Duplex 250 g/ })).toContainText("0,31");
  });

  test("F04-N1 nome repetido (maiúsculas e acentos)", async ({ page }) => {
    await page.goto("/config/materiais");
    await page.getByRole("button", { name: "Novo material" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Nome").fill("DUPLEX 300 G");
    await d.getByLabel(/^Espessura/).fill("0,4");
    await d.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(d.getByText("Já existe um material com esse nome.")).toBeVisible();
  });

  test("F04-N2 espessura inválida", async ({ page }) => {
    await page.goto("/config/materiais");
    await page.getByRole("button", { name: "Novo material" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Nome").fill("Teste");
    for (const v of ["0", "5", ""]) {
      await d.getByLabel(/^Espessura/).fill(v);
      await d.getByRole("button", { name: "Salvar", exact: true }).click();
      await expect(d.getByText("Entre 0,1 e 3 mm.")).toBeVisible();
    }
  });
});

test.describe("F05 — equipe e convites (modo local)", () => {
  test("F05-H1/H2/N1/N2 convidar, duplicado, inválido, cancelar", async ({ page }) => {
    await page.goto("/config/equipe");
    await expect(page.getByRole("cell", { name: "Vinícius", exact: true })).toBeVisible();
    await expectAccessible(page, "equipe");

    await page.getByRole("button", { name: "Convidar" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("E-mail").fill("sem-arroba");
    await d.getByRole("button", { name: "Convidar" }).click();
    await expect(d.getByText("E-mail inválido.")).toBeVisible();

    await d.getByLabel("E-mail").fill("nova.pessoa@exemplo.test");
    await d.getByRole("button", { name: "Convidar" }).click();
    await expect(page.getByText("nova.pessoa@exemplo.test", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Convidar" }).click();
    await page.getByRole("dialog").getByLabel("E-mail").fill("Nova.Pessoa@exemplo.test");
    await page.getByRole("dialog").getByRole("button", { name: "Convidar" }).click();
    await expect(page.getByRole("dialog").getByText(/Já existe um convite pendente/)).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Cancelar convite de nova.pessoa@exemplo.test" }).click();
    await expect(page.getByText("nova.pessoa@exemplo.test", { exact: true })).toHaveCount(0);
  });

  test("F05-N3 não remove o último admin (você não aparece com ações)", async ({ page }) => {
    await page.goto("/config/equipe");
    await expect(page.getByRole("button", { name: /Remover Matheus/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Remover Vinícius" })).toBeVisible();
  });
});

test.describe("Outras telas — acessibilidade", () => {
  for (const [rota, nome] of [
    ["/ajuda", "ajuda"],
    ["/conta", "conta"],
    ["/login", "login"],
    ["/design", "design"],
  ] as const) {
    test(`axe em ${rota}`, async ({ page }) => {
      await page.goto(rota);
      await page.waitForLoadState("networkidle");
      await expectAccessible(page, nome);
    });
  }
});
