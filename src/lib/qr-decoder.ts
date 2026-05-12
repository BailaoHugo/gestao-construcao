// Decodificador de QR codes a partir de imagens (JPEG/PNG) ou PDFs.
//
// Usa jsqr para descodificacao e @napi-rs/canvas para renderizar
// PDFs em ImageData. Funciona em Node lambdas da Vercel sem dependencias
// nativas extra (canvas, sharp, gm).

import jsQR from 'jsqr';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import path from 'path';

// Renderiza a primeira pagina de um PDF em ImageData (RGBA) e devolve.
// Escala "scale" controla a resolucao - 2 e suficiente para a maioria
// dos QR codes (DPI eficaz ~144).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function renderPdfPageToImageData(buf: Buffer, scale = 2): Promise<{ data: Uint8ClampedArray; width: number; height: number } | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs') as any;
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      const workerPath = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `file://${workerPath}`;
    }
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf), useWorkerFetch: false, isEvalSupported: false }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext('2d');

    // pdfjs requer um objecto compativel com CanvasRenderingContext2D.
    // @napi-rs/canvas e suficientemente compativel mas o TypeScript reclama.
    await page.render({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canvasContext: ctx as any,
      viewport,
    }).promise;

    const imageData = ctx.getImageData(0, 0, viewport.width, viewport.height);
    return { data: imageData.data as unknown as Uint8ClampedArray, width: viewport.width, height: viewport.height };
  } catch (e) {
    console.warn('[qr-decoder] PDF render error:', e instanceof Error ? e.message : e);
    return null;
  }
}

// Carrega uma imagem (JPEG/PNG/etc) em ImageData (RGBA).
async function loadImageToImageData(buf: Buffer): Promise<{ data: Uint8ClampedArray; width: number; height: number } | null> {
  try {
    const img = await loadImage(buf);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    return { data: imageData.data as unknown as Uint8ClampedArray, width: img.width, height: img.height };
  } catch (e) {
    console.warn('[qr-decoder] image load error:', e instanceof Error ? e.message : e);
    return null;
  }
}

// Tenta descodificar um QR code a partir de um buffer (imagem ou PDF).
// Devolve a string crua do QR ou null se nao houver/nao for legivel.
export async function decodeQr(buf: Buffer, mimeType: string): Promise<string | null> {
  let img: { data: Uint8ClampedArray; width: number; height: number } | null = null;

  if (mimeType === 'application/pdf') {
    // Tenta varios scales: ATCUD QR sao pequenos, mais scale ajuda
    for (const scale of [2, 3, 4]) {
      img = await renderPdfPageToImageData(buf, scale);
      if (!img) continue;
      const result = jsQR(img.data, img.width, img.height);
      if (result?.data) return result.data;
    }
    return null;
  } else {
    img = await loadImageToImageData(buf);
    if (!img) return null;
    const result = jsQR(img.data, img.width, img.height);
    return result?.data || null;
  }
}
