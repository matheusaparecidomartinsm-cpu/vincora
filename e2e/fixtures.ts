import AxeBuilder from "@axe-core/playwright";
import { test as base, expect, type Page } from "@playwright/test";

/** Todo teste falha se houver erro de console, exceção na página ou resposta 5xx. */
export const test = base.extend<{ guard: { errors: string[] } }>({
  guard: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));
      page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
      page.on("response", (r) => r.status() >= 500 && errors.push(`${r.status()} ${r.url()}`));
      await use({ errors });
      expect(errors, "erros de console / 5xx durante o teste").toEqual([]);
    },
    { auto: true },
  ],
});

/** axe: falha em violações sérias ou críticas (WCAG 2.1 A/AA). */
export async function expectAccessible(page: Page, label: string) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const graves = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(
    graves.map((v) => `${v.id} (${v.impact}): ${v.nodes.length}× — ${v.nodes[0]?.target.join(" ")}`),
    `acessibilidade em ${label}`,
  ).toEqual([]);
}

/** Abre o editor do cartucho já com medidas. */
export async function abrirEditor(page: Page, medidas?: [string, string, string]) {
  await page.goto("/criar/fundo-cartucho");
  await expect(page.getByRole("heading", { name: "Caixa fundo cartucho" })).toBeVisible();
  // espera os materiais carregarem (select aparece)
  await expect(page.getByRole("combobox", { name: "Material" })).toBeVisible();
  if (medidas) {
    await page.getByLabel(/^Largura/).fill(medidas[0]);
    await page.getByLabel(/^Altura/).fill(medidas[1]);
    await page.getByLabel(/^Profundidade/).fill(medidas[2]);
  }
}

export const exportar = (page: Page) => page.getByRole("button", { name: "Exportar PDF, SVG e DXF" });

export { expect };
