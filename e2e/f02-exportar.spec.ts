import { readFileSync } from "node:fs";
import { unzipSync } from "fflate";
import { abrirEditor, expect, exportar, test } from "./fixtures";

const SPEC = { model: "fundo-cartucho", largura: 70, altura: 150, profundidade: 40, espessura: 0.345, sangria: true, areasCola: true };

test.describe("F02 — exportar", () => {
  test("F02-H1/H2 zip completo + baixar de novo", async ({ page }) => {
    await abrirEditor(page, ["70", "150", "40"]);
    const dl1 = page.waitForEvent("download");
    await exportar(page).click();
    const d1 = await dl1;
    expect(d1.suggestedFilename()).toBe("faca-fundo-cartucho-70x150x40.zip");
    const files = Object.keys(unzipSync(readFileSync((await d1.path())!))).sort();
    expect(files).toEqual([
      "LEIA-ME.txt",
      "faca-fundo-cartucho-70x150x40.dxf",
      "faca-fundo-cartucho-70x150x40.pdf",
      "faca-fundo-cartucho-70x150x40.svg",
    ]);
    await expect(page.getByText("Arquivos gerados", { exact: true })).toBeVisible();
    const dl2 = page.waitForEvent("download");
    await page.getByRole("button", { name: "Baixar de novo" }).click();
    expect((await dl2).suggestedFilename()).toBe("faca-fundo-cartucho-70x150x40.zip");
  });

  test("F02-E1 duplo clique gera um download só", async ({ page }) => {
    await abrirEditor(page, ["70", "150", "40"]);
    let n = 0;
    page.on("download", () => n++);
    await exportar(page).dblclick();
    await expect(page.getByText("Arquivos gerados", { exact: true })).toBeVisible();
    await page.waitForTimeout(1500);
    expect(n).toBe(1);
  });

  test("F02-E3 [B-002] botão mantém o nome acessível enquanto gera", async ({ page }) => {
    await abrirEditor(page, ["70", "150", "40"]);
    await page.route("/api/export", async (route) => {
      await new Promise((r) => setTimeout(r, 1200));
      await route.continue();
    });
    await exportar(page).click();
    const ocupado = page.getByRole("button", { name: "Exportar PDF, SVG e DXF" });
    await expect(ocupado).toHaveAttribute("aria-busy", "true");
    await expect(page.getByText("Arquivos gerados", { exact: true })).toBeVisible();
  });

  test("F02-E2 medida decimal no nome do arquivo", async ({ page }) => {
    await abrirEditor(page, ["70,5", "150", "40"]);
    const dl = page.waitForEvent("download");
    await exportar(page).click();
    const d = await dl;
    expect(d.suggestedFilename()).toBe("faca-fundo-cartucho-70,5x150x40.zip");
    expect(Object.keys(unzipSync(readFileSync((await d.path())!)))).toHaveLength(4);
  });

  test("F02-N1 API recusa medida fora da regra (422)", async ({ request }) => {
    const r = await request.post("/api/export", { data: { spec: { ...SPEC, profundidade: 62 } } });
    expect(r.status()).toBe(422);
    expect((await r.json()).errors.profundidade).toMatch(/50 mm/);
  });

  test("F02-N2 API recusa corpo inválido", async ({ request }) => {
    expect((await request.post("/api/export", { headers: { "Content-Type": "application/json" }, data: "{quebrado" })).status()).toBe(400);
    expect((await request.post("/api/export", { data: {} })).status()).toBe(400);
    expect((await request.post("/api/export", { data: { spec: { ...SPEC, model: "nao-existe" } } })).status()).toBe(422);
    expect((await request.post("/api/export", { data: { spec: { ...SPEC, largura: "70" } } })).status()).toBe(422);
  });

  test("F02-N3 API recusa O.S. longa demais", async ({ request }) => {
    const r = await request.post("/api/export", { data: { spec: SPEC, os: "9".repeat(500) } });
    expect(r.status()).toBe(400);
  });
});
