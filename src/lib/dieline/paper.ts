export type Paper = { name: "A4" | "A3" | "A2" | "A1" | "A0" | "Plotter"; w: number; h: number };

export const PAPERS: Paper[] = [
  { name: "A4", w: 210, h: 297 },
  { name: "A3", w: 297, h: 420 },
  { name: "A2", w: 420, h: 594 },
  { name: "A1", w: 594, h: 841 },
  { name: "A0", w: 841, h: 1189 },
];

/** Espaço que o PDF reserva em volta da faca: margem, cotas, régua e carimbo. */
export const PDF_MARGIN = 15; // mm em cada lado
export const PDF_COTAS = 22; // mm extra embaixo e à direita para cotas
export const PDF_CARIMBO = 28; // mm extra embaixo para o carimbo

export function pageNeeded(w: number, h: number) {
  return { w: w + 2 * PDF_MARGIN + PDF_COTAS, h: h + 2 * PDF_MARGIN + PDF_COTAS + PDF_CARIMBO };
}

/** Menor folha ISO em que a faca cabe a 100 %, em retrato ou paisagem. */
export function smallestPaper(w: number, h: number): Paper & { landscape: boolean } {
  const need = pageNeeded(w, h);
  for (const pp of PAPERS) {
    if (need.w <= pp.w && need.h <= pp.h) return { ...pp, landscape: false };
    if (need.w <= pp.h && need.h <= pp.w) return { ...pp, landscape: true };
  }
  return { name: "Plotter", w: Math.ceil(need.w), h: Math.ceil(need.h), landscape: false };
}
