"use client";

/// <reference types="vite/client" />

import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { getStoredPdf } from "./pdf-storage";

export async function extractStoredPdfText(literatureId: string, maxCharacters = 120000) {
  const stored = await getStoredPdf(literatureId);
  if (!stored) throw new Error("请先打开文献并导入 PDF");

  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const data = new Uint8Array(await stored.blob.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data });
  const document = await loadingTask.promise;
  const pages: string[] = [];
  let characterCount = 0;

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages && characterCount < maxCharacters; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items.map((item) => "str" in item ? item.str : "").join(" ").replace(/\s+/g, " ").trim();
      if (!text) continue;
      const remaining = maxCharacters - characterCount;
      const chunk = `[第 ${pageNumber} 页]\n${text.slice(0, remaining)}`;
      pages.push(chunk);
      characterCount += chunk.length;
    }
  } finally {
    await loadingTask.destroy();
  }

  const result = pages.join("\n\n");
  if (result.length < 100) throw new Error("没有从 PDF 中识别到足够文字；扫描版 PDF 暂时需要 OCR");
  return result;
}
