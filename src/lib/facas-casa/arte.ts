"use client";
import type { FacaCasa } from "./index";

/**
 * Lê a arte do cliente (PDF, PNG ou JPG) e devolve uma imagem recortada no retângulo da faca.
 * - PDF do mesmo tamanho da arte padrão: recorta exatamente onde a faca está na página.
 * - Outros arquivos: considera que a imagem já é só a área da faca (estica para o tamanho dela).
 */
const PX_MM = 5;

export async function carregarArte(file: File, f: FacaCasa): Promise<string> {
  const [pw, ph] = f.pdf.pagina;
  const { w, h } = f.aberta;
  let fonte: CanvasImageSource;
  let largura: number;
  let altura: number;
  let mmPorPx: number | null = null; // escala da fonte quando sabemos o tamanho real

  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const pg = await doc.getPage(1);
    const vp0 = pg.getViewport({ scale: 1 });
    const escala = (PX_MM * 25.4) / 72;
    const vp = pg.getViewport({ scale: escala });
    const c = document.createElement("canvas");
    c.width = Math.round(vp.width);
    c.height = Math.round(vp.height);
    await pg.render({ canvasContext: c.getContext("2d")!, viewport: vp }).promise;
    fonte = c;
    largura = c.width;
    altura = c.height;
    mmPorPx = 1 / PX_MM;
    const paginaMm: [number, number] = [(vp0.width * 25.4) / 72, (vp0.height * 25.4) / 72];
    if (Math.abs(paginaMm[0] - pw) > 3 || Math.abs(paginaMm[1] - ph) > 3) mmPorPx = null;
  } else {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    await img.decode();
    URL.revokeObjectURL(url);
    fonte = img;
    largura = img.naturalWidth;
    altura = img.naturalHeight;
    // imagem com a proporção da página inteira da arte: trata como a página
    if (Math.abs(largura / altura - pw / ph) < 0.01) mmPorPx = pw / largura;
  }

  const out = document.createElement("canvas");
  out.width = Math.round(w * PX_MM);
  out.height = Math.round(h * PX_MM);
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, out.width, out.height);
  if (mmPorPx) {
    const [ox, oy] = f.pdf.origem;
    ctx.drawImage(fonte, ox / mmPorPx, oy / mmPorPx, w / mmPorPx, h / mmPorPx, 0, 0, out.width, out.height);
  } else {
    ctx.drawImage(fonte, 0, 0, largura, altura, 0, 0, out.width, out.height);
  }
  return out.toDataURL("image/jpeg", 0.85);
}
