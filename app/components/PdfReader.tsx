"use client";

/// <reference types="vite/client" />

import type { PDFDocumentProxy, RenderTask, TextLayer as PdfTextLayer } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { ChangeEvent, DragEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { deleteStoredPdf, getStoredPdf, saveStoredPdf, StoredPdf } from "../lib/pdf-storage";

type PdfRecordKind = "理论" | "概念" | "方法" | "证据" | "局限" | "我的思考";

type PdfRecord = {
  id: number;
  kind: PdfRecordKind;
  quote: string;
  page: string;
  thought: string;
};

type HighlightDraft = {
  quote: string;
  page: string;
  kind: PdfRecordKind;
  thought: string;
};

type PdfOutlineItem = {
  title: string;
  dest: string | unknown[] | null;
  items: PdfOutlineItem[];
};

const highlightKinds: PdfRecordKind[] = ["理论", "概念", "方法", "证据", "局限", "我的思考"];

function safelyCleanupDocument(document: PDFDocumentProxy | null) {
  if (!document) return;
  void document.cleanup().catch((reason: unknown) => {
    const message = reason instanceof Error ? reason.message : String(reason ?? "");
    if (!/rendering cancelled/i.test(message)) console.error("PDF 清理失败", reason);
  });
}

export default function PdfReader({ literatureId, title, records, onAiAssist, onTranslate, onSaveHighlight, onNotify }: {
  literatureId: string;
  title: string;
  records: PdfRecord[];
  onAiAssist: () => void;
  onTranslate: () => void;
  onSaveHighlight: (draft: HighlightDraft) => void;
  onNotify: (message: string) => void;
}) {
  const [storedPdf, setStoredPdf] = useState<StoredPdf | null>(null);
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.15);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [selectedPage, setSelectedPage] = useState(1);
  const [outline, setOutline] = useState<PdfOutlineItem[]>([]);
  const [sidePanel, setSidePanel] = useState<"outline" | "highlights" | "translation">("outline");
  const [kind, setKind] = useState<PdfRecordKind>("证据");
  const [thought, setThought] = useState("");
  const [translationSource, setTranslationSource] = useState("");
  const [translationText, setTranslationText] = useState("");
  const [translationTarget, setTranslationTarget] = useState("简体中文");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentRef = useRef<PDFDocumentProxy | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const scrollFrameRef = useRef<number | null>(null);

  const openPdf = useCallback(async (stored: StoredPdf) => {
    setLoading(true);
    setError("");
    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
      const data = new Uint8Array(await stored.blob.arrayBuffer());
      const loadingTask = pdfjs.getDocument({ data });
      const document = await loadingTask.promise;
      safelyCleanupDocument(documentRef.current);
      documentRef.current = document;
      setPdfDocument(document);
      setStoredPdf(stored);
      setCurrentPage(1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "PDF 无法打开，请尝试重新导入");
      setPdfDocument(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    setSelectedText("");
    setTranslationSource("");
    setTranslationText("");
    getStoredPdf(literatureId)
      .then((stored) => {
        if (!active) return;
        if (stored) return openPdf(stored);
        setStoredPdf(null);
        setPdfDocument(null);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError("无法读取本机保存的 PDF");
        setLoading(false);
      });
    return () => { active = false; };
  }, [literatureId, openPdf]);

  useEffect(() => {
    return () => {
      safelyCleanupDocument(documentRef.current);
      documentRef.current = null;
      if (scrollFrameRef.current !== null) window.cancelAnimationFrame(scrollFrameRef.current);
    };
  }, []);

  useEffect(() => {
    if (!pdfDocument) return;
    let active = true;
    void pdfDocument.getOutline().then((items) => {
      if (!active) return;
      const next = (items ?? []) as PdfOutlineItem[];
      setOutline(next);
      setSidePanel(next.length ? "outline" : "highlights");
    }).catch(() => {
      if (active) setOutline([]);
    });
    return () => { active = false; };
  }, [pdfDocument]);

  const pageRecords = useMemo(() => records.filter((record) => record.page === `p. ${currentPage}`), [records, currentPage]);
  const recordsByPage = useMemo(() => {
    const result = new Map<number, PdfRecord[]>();
    records.forEach((record) => {
      const page = Number(record.page.match(/\d+/)?.[0]);
      if (!page) return;
      result.set(page, [...(result.get(page) ?? []), record]);
    });
    return result;
  }, [records]);

  async function acceptFile(file?: File) {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("请选择 PDF 文件");
      return;
    }
    if (file.size > 120 * 1024 * 1024) {
      setError("当前版本支持不超过 120 MB 的 PDF");
      return;
    }
    try {
      const stored = await saveStoredPdf(literatureId, file);
      await openPdf(stored);
      onNotify("PDF 已保存在本机并关联到当前文献");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "PDF 保存失败");
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    void acceptFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void acceptFile(event.dataTransfer.files?.[0]);
  }

  async function removePdf() {
    if (!window.confirm("移除当前文献关联的 PDF？阅读记录会保留。")) return;
    await deleteStoredPdf(literatureId);
    safelyCleanupDocument(documentRef.current);
    documentRef.current = null;
    setStoredPdf(null);
    setPdfDocument(null);
    setSelectedText("");
    setTranslationSource("");
    setTranslationText("");
    onNotify("PDF 已从本地工作区移除，阅读记录仍然保留");
  }

  function captureSelection(text: string, page: number) {
    const source = text.slice(0, 5000);
    setSelectedText(source);
    setSelectedPage(page);
    setThought("");
    setTranslationSource(source);
    setTranslationText("");
    setSidePanel("highlights");
  }

  function openTranslationPanel() {
    if (selectedText.trim() && !translationSource.trim()) setTranslationSource(selectedText.trim());
    setSidePanel("translation");
  }

  function requestTranslation() {
    if (!translationSource.trim()) {
      onNotify("请先在 PDF 中选择原文，或将原文粘贴到翻译区");
      return;
    }
    onTranslate();
  }

  function saveHighlight() {
    if (!selectedText.trim()) return;
    onSaveHighlight({ quote: selectedText.trim(), page: `p. ${selectedPage}`, kind, thought: thought.trim() });
    setSelectedText("");
    setThought("");
    window.getSelection()?.removeAllRanges();
  }

  function updateCurrentPage() {
    if (scrollFrameRef.current !== null) return;
    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      const stage = stageRef.current;
      if (!stage) return;
      const stageRect = stage.getBoundingClientRect();
      const focusLine = stageRect.top + Math.min(220, stageRect.height * .32);
      const pages = Array.from(stage.querySelectorAll<HTMLElement>("[data-pdf-page]"));
      let closestPage = currentPage;
      let closestDistance = Number.POSITIVE_INFINITY;
      pages.forEach((page) => {
        const distance = Math.abs(page.getBoundingClientRect().top - focusLine);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestPage = Number(page.dataset.pdfPage) || closestPage;
        }
      });
      setCurrentPage(closestPage);
    });
  }

  async function openOutlineItem(item: PdfOutlineItem) {
    if (!pdfDocument || !item.dest) return;
    try {
      const destination = typeof item.dest === "string" ? await pdfDocument.getDestination(item.dest) : item.dest;
      if (!destination?.length) return;
      const pageIndex = await pdfDocument.getPageIndex(destination[0] as { num: number; gen: number });
      const pageNumber = pageIndex + 1;
      const page = stageRef.current?.querySelector<HTMLElement>(`[data-pdf-page="${pageNumber}"]`);
      page?.scrollIntoView({ behavior: "smooth", block: "start" });
      setCurrentPage(pageNumber);
    } catch {
      onNotify("暂时无法定位这个目录条目");
    }
  }

  if (loading) {
    return <div className="pdf-loading"><i>PDF</i><strong>正在打开文献…</strong><span>首次加载可能需要几秒</span></div>;
  }

  if (!storedPdf || !pdfDocument) {
    return (
      <div className="pdf-empty-wrap">
        <div
          className={`pdf-dropzone ${dragging ? "dragging" : ""}`}
          onDragEnter={() => setDragging(true)}
          onDragLeave={() => setDragging(false)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <div className="pdf-file-mark">PDF</div>
          <span className="eyebrow">LOCAL PDF READER</span>
          <h2>把这篇文献的 PDF 放进来</h2>
          <p>文件只保存在当前电脑的本地工作区，不会上传。导入后即可选中文字并创建结构化记录。</p>
          <button onClick={() => fileInputRef.current?.click()}>选择 PDF 文件</button>
          <small>也可以直接拖放到这里 · 最大 120 MB</small>
          {error && <div className="pdf-error">{error}</div>}
        </div>
        <input ref={fileInputRef} className="hidden-file-input" type="file" accept="application/pdf,.pdf" onChange={handleFileChange} />
      </div>
    );
  }

  return (
    <div className="pdf-reader">
      <header className="pdf-toolbar">
        <div className="pdf-file-info"><i>PDF</i><span><strong>{storedPdf.name}</strong><small>{title} · 连续滚动阅读</small></span></div>
        <div className="pdf-page-position" aria-label={`当前第 ${currentPage} 页，共 ${pdfDocument.numPages} 页`}><strong>{currentPage}</strong><span>/ {pdfDocument.numPages}</span></div>
        <div className="pdf-zoom-controls">
          <button onClick={() => setScale((value) => Math.max(.75, Number((value - .1).toFixed(2))))} aria-label="缩小">−</button>
          <span>{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale((value) => Math.min(1.8, Number((value + .1).toFixed(2))))} aria-label="放大">＋</button>
        </div>
        <div className="pdf-file-actions"><button onClick={() => fileInputRef.current?.click()}>替换文件</button><button onClick={() => void removePdf()}>移除</button></div>
        <input ref={fileInputRef} className="hidden-file-input" type="file" accept="application/pdf,.pdf" onChange={handleFileChange} />
      </header>

      {error && <div className="pdf-inline-error">{error}</div>}
      <div className="pdf-reader-body">
        <div ref={stageRef} className="pdf-stage" onScroll={updateCurrentPage}>
          <div className="pdf-continuous-pages">
            {Array.from({ length: pdfDocument.numPages }, (_, index) => {
              const pageNumber = index + 1;
              return <PdfPage key={pageNumber} document={pdfDocument} pageNumber={pageNumber} scale={scale} records={recordsByPage.get(pageNumber) ?? []} onSelect={captureSelection} />;
            })}
          </div>
        </div>

        <aside className="highlight-workbench">
          <div className="pdf-side-tabs">
            <button className={sidePanel === "outline" ? "active" : ""} onClick={() => setSidePanel("outline")}>目录</button>
            <button className={sidePanel === "highlights" ? "active" : ""} onClick={() => setSidePanel("highlights")}>划线记录</button>
            <button className={sidePanel === "translation" ? "active" : ""} onClick={openTranslationPanel}>翻译</button>
          </div>
          {sidePanel === "outline" ? <div className="pdf-outline-panel">
            <div className="highlight-title"><span>文献目录</span><small>{outline.length ? "点击跳转" : "未检测到目录"}</small></div>
            {outline.length ? <PdfOutline items={outline} onOpen={(item) => void openOutlineItem(item)} /> : <div className="empty-outline"><i>目</i><strong>这份 PDF 没有内置目录</strong><p>仍然可以通过连续滚动阅读全部页面。</p></div>}
          </div> : sidePanel === "translation" ? <div className="translation-panel">
            <div className="highlight-title"><span>查看翻译</span><small>{translationSource ? `原文 p. ${selectedPage}` : "等待选择原文"}</small></div>
            <div className="translation-guide"><i>译</i><p>选中 PDF 中的文字后切换到这里，原文会自动带入。</p></div>
            <label>原文<textarea value={translationSource} onChange={(event) => { setTranslationSource(event.target.value); setTranslationText(""); }} placeholder="在 PDF 中选择文字，或在这里粘贴需要翻译的原文……" /></label>
            <div className="translation-language-row">
              <label>翻译为<select value={translationTarget} onChange={(event) => setTranslationTarget(event.target.value)}><option>简体中文</option><option>繁體中文</option><option>English</option><option>日本語</option><option>한국어</option></select></label>
              <button onClick={requestTranslation} disabled={!translationSource.trim()}>AI 翻译</button>
            </div>
            <label>译文<textarea className="translation-result" value={translationText} onChange={(event) => setTranslationText(event.target.value)} placeholder={`翻译为${translationTarget}的内容会显示在这里，也可以粘贴或校订译文。`} /></label>
            <div className="translation-note"><span>AI</span><p>翻译按钮使用设置中的统一 AI 入口；尚未连接时会带你前往设置。</p></div>
            {(translationSource || translationText) && <button className="clear-translation" onClick={() => { setTranslationSource(""); setTranslationText(""); }}>清空当前翻译</button>}
          </div> : <>
          <div className="highlight-title"><span>划线记录</span><small>第 {currentPage} 页 · {pageRecords.length} 条</small></div>
          {selectedText ? (
            <div className="highlight-editor">
              <div className="selected-quote"><span>刚刚选中的原文</span><blockquote>{selectedText}</blockquote><small>p. {selectedPage}</small></div>
              <label>记录类型<select value={kind} onChange={(event) => setKind(event.target.value as PdfRecordKind)}>{highlightKinds.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>我的理解<textarea value={thought} onChange={(event) => setThought(event.target.value)} placeholder="这段话为什么重要？它与你的研究有什么关系？" /></label>
              <button className="ai-explain-selection" onClick={onAiAssist}>AI 解读这段原文</button>
              <button className="save-highlight" onClick={saveHighlight}>保存为{kind}记录</button>
              <button className="cancel-highlight" onClick={() => { setSelectedText(""); window.getSelection()?.removeAllRanges(); }}>取消选择</button>
            </div>
          ) : (
            <div className="selection-guide"><span>划</span><h3>选中 PDF 中的文字</h3><p>松开鼠标后，原文和页码会自动出现在这里。</p><ol><li>选择重要原文</li><li>判断属于哪类记录</li><li>写下自己的理解</li></ol></div>
          )}

          <div className="page-highlights">
            <div><strong>本页已有记录</strong><span>{pageRecords.length}</span></div>
            {pageRecords.length ? pageRecords.map((record) => <article key={record.id}><span>{record.kind}</span><p>“{record.quote}”</p>{record.thought && <small>{record.thought}</small>}</article>) : <p className="no-page-highlights">本页还没有划线记录</p>}
          </div>
          </>}
        </aside>
      </div>
    </div>
  );
}

function PdfOutline({ items, onOpen, depth = 0 }: { items: PdfOutlineItem[]; onOpen: (item: PdfOutlineItem) => void; depth?: number }) {
  return <ol className="pdf-outline" data-depth={depth}>
    {items.map((item, index) => <li key={`${depth}-${index}-${item.title}`}>
      <button onClick={() => onOpen(item)} disabled={!item.dest}><span>{item.title || `目录项 ${index + 1}`}</span><i>›</i></button>
      {item.items?.length ? <PdfOutline items={item.items} onOpen={onOpen} depth={depth + 1} /> : null}
    </li>)}
  </ol>;
}

function PdfPage({ document, pageNumber, scale, records, onSelect }: {
  document: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  records: PdfRecord[];
  onSelect: (text: string, page: number) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 620, height: 820, scale: 1.15 });
  const [shouldRender, setShouldRender] = useState(pageNumber <= 2);
  const [rendering, setRendering] = useState(true);

  useEffect(() => {
    const element = wrapRef.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setShouldRender(entry.isIntersecting), { rootMargin: "1100px 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldRender) return;
    let cancelled = false;
    let renderTask: RenderTask | null = null;
    let textLayer: PdfTextLayer | null = null;

    async function renderPage() {
      setRendering(true);
      const pdfjs = await import("pdfjs-dist");
      const page = await document.getPage(pageNumber);
      if (cancelled) return;
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const textContainer = textLayerRef.current;
      if (!canvas || !textContainer) return;

      const outputScale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      setSize({ width: Math.floor(viewport.width), height: Math.floor(viewport.height), scale });

      const context = canvas.getContext("2d", { alpha: false });
      if (!context) return;
      renderTask = page.render({
        canvas: null,
        canvasContext: context,
        viewport,
        transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
      });

      textContainer.replaceChildren();
      textContainer.style.setProperty("--total-scale-factor", String(viewport.scale));
      textContainer.style.width = `${Math.floor(viewport.width)}px`;
      textContainer.style.height = `${Math.floor(viewport.height)}px`;
      const textContent = await page.getTextContent();
      const layer = new pdfjs.TextLayer({ textContentSource: textContent, container: textContainer, viewport });
      textLayer = layer;

      await Promise.all([renderTask.promise, layer.render()]);
      if (cancelled) return;
      const quotes = records.map((record) => record.quote.replace(/\s+/g, " "));
      layer.textDivs.forEach((textDiv) => {
        const text = textDiv.textContent?.trim().replace(/\s+/g, " ") ?? "";
        if (text.length >= 5 && quotes.some((quote) => quote.includes(text))) textDiv.classList.add("saved-highlight");
      });
      setRendering(false);
    }

    void renderPage().catch((reason: unknown) => {
      const message = reason instanceof Error ? reason.message : String(reason ?? "");
      if (!cancelled && !/rendering cancelled/i.test(message)) {
        console.error(`PDF 第 ${pageNumber} 页渲染失败`, reason);
      }
      if (!cancelled) setRendering(false);
    });
    return () => {
      cancelled = true;
      renderTask?.cancel();
      textLayer?.cancel();
    };
  }, [document, pageNumber, scale, records, shouldRender]);

  function readSelection() {
    const selection = window.getSelection();
    const text = selection?.toString().trim() ?? "";
    if (!selection || !text || !selection.rangeCount || !textLayerRef.current) return;
    const range = selection.getRangeAt(0);
    if (!textLayerRef.current.contains(range.commonAncestorContainer)) return;
    onSelect(text, pageNumber);
  }

  return (
    <div ref={wrapRef} className="pdf-page-wrap" data-pdf-page={pageNumber}>
      {shouldRender ? <>
      {rendering && <div className="page-rendering"><i /><span>正在渲染第 {pageNumber} 页…</span></div>}
      <div className="pdf-page" style={{ width: size.width * scale / size.scale, height: size.height * scale / size.scale }} data-page={pageNumber} onMouseUp={readSelection} onKeyUp={readSelection}>
        <canvas ref={canvasRef} />
        <div ref={textLayerRef} className="textLayer" />
      </div>
      </> : <div className="pdf-page-placeholder" style={{ width: size.width * scale / size.scale, height: size.height * scale / size.scale }}><span>第 {pageNumber} 页</span></div>}
      <span className="physical-page-number">{pageNumber}</span>
    </div>
  );
}
