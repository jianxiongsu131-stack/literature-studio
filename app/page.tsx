"use client";

import { ChangeEvent, CSSProperties, FormEvent, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { AnalysisResult, AnalysisSection, createMockAnalysis } from "./lib/analysis";
import PdfReader from "./components/PdfReader";
import SettingsCenter from "./components/SettingsCenter";
import { AiConnectionSettings, aiConnectionName, aiConnectionReady, defaultAiConnectionSettings } from "./lib/ai-settings";
import { CloudServicesSettings, cloudModeName, defaultCloudServicesSettings } from "./lib/cloud-services";
import { deleteStoredPdf, saveStoredPdf } from "./lib/pdf-storage";
import { loadWorkspaceValue, saveWorkspaceValue } from "./lib/workspace-storage";

type ReadingStatus = "粗读" | "精读" | "已完成";
type RecordKind = "理论" | "概念" | "方法" | "证据" | "局限" | "我的思考";
type MapAppearance = {
  background: "plain" | "warm" | "dark";
  line: "coffee" | "ginger" | "sage";
};

type ResearchProject = {
  id: string;
  name: string;
  shortName: string;
  description: string;
  updatedAt: string;
  pinned: boolean;
  color: "ginger" | "apricot" | "coffee";
  tags: string[];
  x?: number;
  y?: number;
};

type Theme = {
  id: string;
  projectId: string;
  name: string;
  description: string;
  tags: string[];
  x: number;
  y: number;
};

type Literature = {
  id: string;
  themeId: string;
  title: string;
  author: string;
  year: string;
  status: ReadingStatus;
  tags: string[];
  x: number;
  y: number;
};

type ResearchRecord = {
  id: number;
  literatureId: string;
  kind: RecordKind;
  quote: string;
  page: string;
  thought: string;
  question: string;
  chapter: string;
};

type NodeEditTarget =
  | { type: "project"; item: ResearchProject }
  | { type: "theme"; item: Theme }
  | { type: "literature"; item: Literature };

type NodeEditorValues = {
  title: string;
  shortTitle: string;
  description: string;
  author: string;
  year: string;
  tags: string[];
};

const mainProjectId = "ai-reading";
const defaultMapAppearance: MapAppearance = { background: "plain", line: "coffee" };

const initialProjects: ResearchProject[] = [
  { id: mainProjectId, name: "AI 辅助文献阅读与深度思考", shortName: "AI 辅助阅读", description: "毕业论文 · 文献综述与原型研究", updatedAt: "刚刚", pinned: true, color: "ginger", tags: ["毕业论文", "AI 阅读"], x: 50, y: 52 },
  { id: "human-ai-writing", name: "学术写作中的人机协作", shortName: "人机协作写作", description: "后续研究方向 · 研究构想", updatedAt: "昨天", pinned: false, color: "apricot", tags: ["学术写作"], x: 50, y: 52 },
  { id: "digital-knowledge", name: "数字学习与知识管理", shortName: "数字知识管理", description: "长期积累 · 理论资料库", updatedAt: "8 月 2 日", pinned: false, color: "coffee", tags: ["知识管理"], x: 50, y: 52 },
];

const initialThemes: Theme[] = [
  { id: "deep", projectId: mainProjectId, name: "深度阅读", description: "认知投入与理解质量", tags: ["核心理论"], x: 35, y: 28 },
  { id: "prompt", projectId: mainProjectId, name: "提示设计", description: "结构化问题与批判思考", tags: ["设计方法"], x: 64, y: 23 },
  { id: "knowledge", projectId: mainProjectId, name: "知识积累", description: "跨文献连接与长期复用", tags: ["长期研究"], x: 69, y: 67 },
  { id: "method", projectId: mainProjectId, name: "研究方法", description: "实验、访谈与评价框架", tags: ["方法"], x: 34, y: 73 },
  { id: "collaboration", projectId: "human-ai-writing", name: "协作模式", description: "人机分工与控制权", tags: ["人机协作"], x: 37, y: 31 },
  { id: "authorship", projectId: "human-ai-writing", name: "作者身份", description: "原创性与责任归属", tags: ["伦理"], x: 67, y: 63 },
  { id: "pkm", projectId: "digital-knowledge", name: "个人知识管理", description: "收集、组织与复用", tags: ["PKM"], x: 35, y: 27 },
  { id: "digital-note", projectId: "digital-knowledge", name: "数字笔记", description: "外部记忆与认知负荷", tags: ["笔记"], x: 69, y: 35 },
  { id: "connection", projectId: "digital-knowledge", name: "知识连接", description: "主题网络与意义生成", tags: ["连接"], x: 46, y: 74 },
];

const initialLiterature: Literature[] = [
  { id: "liu-2024", themeId: "deep", title: "Deep Reading in AI-mediated Environments", author: "Liu & Chen", year: "2024", status: "精读", tags: ["深度阅读", "概念框架"], x: 18, y: 34 },
  { id: "park-2023", themeId: "deep", title: "Cognitive Engagement in Digital Reading", author: "Park et al.", year: "2023", status: "粗读", tags: ["认知投入"], x: 15, y: 59 },
  { id: "sun-2022", themeId: "deep", title: "Rethinking Reading Depth", author: "Sun", year: "2022", status: "已完成", tags: ["理论基础"], x: 31, y: 84 },
  { id: "wang-2025", themeId: "prompt", title: "Structured Prompts and Critical Reading", author: "Wang et al.", year: "2025", status: "精读", tags: ["提示问题", "批判性思维"], x: 83, y: 13 },
  { id: "miller-2022", themeId: "method", title: "Think-aloud Protocols in Reading Research", author: "Miller", year: "2022", status: "已完成", tags: ["思维出声", "访谈"], x: 17, y: 87 },
  { id: "zhang-2023", themeId: "knowledge", title: "Long-term Knowledge Retention", author: "Zhang", year: "2023", status: "粗读", tags: ["长期研究"], x: 86, y: 80 },
];

const initialRecords: ResearchRecord[] = [
  { id: 1, literatureId: "liu-2024", kind: "理论", quote: "深度阅读并非简单的信息获取，而是读者在文本、既有知识与问题意识之间建立持续联系的过程。", page: "p. 12", thought: "可以用来界定‘深度阅读’，也提醒我不能只用阅读速度衡量 AI 的作用。", question: "RQ1：AI 辅助工具如何影响深度阅读？", chapter: "2.1 核心概念界定" },
  { id: 2, literatureId: "liu-2024", kind: "证据", quote: "参与者在使用反思性提示后，更频繁地回到前文核对论证关系。", page: "p. 18", thought: "可以作为提示设计影响阅读过程的行为证据。", question: "RQ2：怎样的提示能促进批判思考？", chapter: "4.2 设计原则" },
  { id: 3, literatureId: "liu-2024", kind: "局限", quote: "研究仅观察了单次阅读任务，尚不能推断长期知识保持效果。", page: "p. 24", thought: "这与我的长期积累主题直接相关，可以转化为后续研究问题。", question: "RQ3：记录如何支持长期知识积累？", chapter: "6.2 研究局限" },
];

const recordKinds: { kind: RecordKind; hint: string; mark: string }[] = [
  { kind: "理论", hint: "核心主张与适用边界", mark: "理" },
  { kind: "概念", hint: "定义、区别与关联", mark: "概" },
  { kind: "方法", hint: "样本、步骤与测量", mark: "方" },
  { kind: "证据", hint: "关键结果与支持关系", mark: "证" },
  { kind: "局限", hint: "作者承认或你发现的问题", mark: "限" },
  { kind: "我的思考", hint: "判断、疑问与新联系", mark: "思" },
];

const statusOptions: ReadingStatus[] = ["粗读", "精读", "已完成"];

export default function Home() {
  const [mode, setMode] = useState<"home" | "map" | "study">("home");
  const [projectView, setProjectView] = useState<"map" | "matrix">("map");
  const [homeSection, setHomeSection] = useState<"library" | "settings" | "account">("library");
  const [projects, setProjects] = useState<ResearchProject[]>(initialProjects);
  const [activeProjectId, setActiveProjectId] = useState(mainProjectId);
  const [allThemes, setAllThemes] = useState<Theme[]>(initialThemes);
  const [literature, setLiterature] = useState<Literature[]>(initialLiterature);
  const [records, setRecords] = useState<ResearchRecord[]>(initialRecords);
  const [selectedThemeId, setSelectedThemeId] = useState("deep");
  const [selectedLiteratureId, setSelectedLiteratureId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState("introduction");
  const [activeKind, setActiveKind] = useState<RecordKind>("理论");
  const [analysis, setAnalysis] = useState<AnalysisResult>(() => createMockAnalysis("liu-2024"));
  const [analyzing, setAnalyzing] = useState(false);
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [editTarget, setEditTarget] = useState<NodeEditTarget | null>(null);
  const [mapAppearance, setMapAppearance] = useState<MapAppearance>(defaultMapAppearance);
  const [aiSettings, setAiSettings] = useState<AiConnectionSettings>(defaultAiConnectionSettings);
  const [cloudSettings, setCloudSettings] = useState<CloudServicesSettings>(defaultCloudServicesSettings);
  const [hasSessionCredential, setHasSessionCredential] = useState(false);
  const [draggingNode, setDraggingNode] = useState("");
  const [toast, setToast] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const dragRef = useRef<{ id: string; type: "project" | "theme" | "literature"; pointerId: number; rect: DOMRect; moved: boolean } | null>(null);
  const lastDraggedRef = useRef<{ id: string } | null>(null);
  const literatureFileInputRef = useRef<HTMLInputElement>(null);
  const aiCredentialRef = useRef("");

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      loadWorkspaceValue<ResearchProject[]>("yanji-projects", initialProjects),
      loadWorkspaceValue<(Theme | Omit<Theme, "projectId">)[]>("yanji-themes", initialThemes),
      loadWorkspaceValue<Literature[]>("yanji-literature", initialLiterature),
      loadWorkspaceValue<ResearchRecord[]>("yanji-records", initialRecords),
      loadWorkspaceValue<MapAppearance>("yanji-map-appearance", defaultMapAppearance),
      loadWorkspaceValue<AiConnectionSettings>("yanji-ai-settings", defaultAiConnectionSettings),
      loadWorkspaceValue<CloudServicesSettings>("yanji-cloud-settings", defaultCloudServicesSettings),
    ]).then(([savedProjects, savedThemes, savedLiterature, savedRecords, savedAppearance, savedAiSettings, savedCloudSettings]) => {
      if (cancelled) return;
      setProjects(savedProjects.map((project) => ({ ...project, tags: project.tags ?? [] })));
      const migratedThemes = savedThemes.map((theme) => ({ ...theme, tags: theme.tags ?? [], projectId: "projectId" in theme ? theme.projectId : mainProjectId }));
      const migratedThemeIds = new Set(migratedThemes.map((theme) => theme.id));
      setAllThemes([...migratedThemes, ...initialThemes.filter((theme) => !migratedThemeIds.has(theme.id))]);
      setLiterature(savedLiterature);
      setRecords(savedRecords);
      setMapAppearance(savedAppearance);
      setAiSettings(savedAiSettings);
      setCloudSettings(savedCloudSettings);
      setHydrated(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void Promise.all([
      saveWorkspaceValue("yanji-projects", projects),
      saveWorkspaceValue("yanji-themes", allThemes),
      saveWorkspaceValue("yanji-literature", literature),
      saveWorkspaceValue("yanji-records", records),
      saveWorkspaceValue("yanji-map-appearance", mapAppearance),
      saveWorkspaceValue("yanji-ai-settings", aiSettings),
      saveWorkspaceValue("yanji-cloud-settings", cloudSettings),
    ]).catch(() => undefined);
  }, [projects, allThemes, literature, records, mapAppearance, aiSettings, cloudSettings, hydrated]);

  const currentProject = projects.find((project) => project.id === activeProjectId) ?? projects[0];
  const projectX = currentProject?.x ?? 50;
  const projectY = currentProject?.y ?? 52;
  const themes = allThemes.filter((theme) => theme.projectId === activeProjectId);
  const themeIds = new Set(themes.map((theme) => theme.id));
  const currentProjectLiterature = literature.filter((item) => themeIds.has(item.themeId));
  const selectedTheme = themes.find((theme) => theme.id === selectedThemeId) ?? themes[0];
  const selectedLiterature = literature.find((item) => item.id === selectedLiteratureId) ?? null;
  const themeLiterature = literature.filter((item) => item.themeId === selectedThemeId);
  const currentRecords = records.filter((item) => item.literatureId === selectedLiteratureId);
  const visibleRecords = currentRecords.filter((item) => item.kind === activeKind);
  const activeSection = analysis.sections.find((section) => section.id === activeSectionId) ?? analysis.sections[0];
  const aiReady = aiConnectionReady(aiSettings, hasSessionCredential);

  const counts = useMemo(() => {
    return recordKinds.reduce<Record<RecordKind, number>>((result, item) => {
      result[item.kind] = currentRecords.filter((record) => record.kind === item.kind).length;
      return result;
    }, { 理论: 0, 概念: 0, 方法: 0, 证据: 0, 局限: 0, 我的思考: 0 });
  }, [currentRecords]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  function openAiSettings() {
    setMode("home");
    setHomeSection("settings");
    notify("请先完成 AI 连接设置");
  }

  function saveAiConnection(settings: AiConnectionSettings, credential: string) {
    if (credential) aiCredentialRef.current = credential;
    setHasSessionCredential(Boolean(aiCredentialRef.current));
    setAiSettings(settings);
    notify(settings.mode === "unconfigured" ? "已保持为不连接 AI" : `${aiConnectionName(settings)}已保存`);
  }

  function saveCloudConnection(settings: CloudServicesSettings) {
    setCloudSettings(settings);
    notify(`云端与服务器设置已保存 · ${cloudModeName(settings.mode)}`);
  }

  function useAiEntry(action: string) {
    if (!aiReady) {
      openAiSettings();
      return;
    }
    notify(`${action}已接入 ${aiConnectionName(aiSettings)} 的统一入口`);
  }

  function beginNodeDrag(event: ReactPointerEvent<HTMLElement>, type: "project" | "theme" | "literature", id: string) {
    if (event.button !== 0) return;
    const canvas = event.currentTarget.closest(".knowledge-map");
    if (!canvas) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { id, type, pointerId: event.pointerId, rect: canvas.getBoundingClientRect(), moved: false };
    setDraggingNode(id);
  }

  function moveNode(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const x = Math.min(94, Math.max(6, ((event.clientX - drag.rect.left) / drag.rect.width) * 100));
    const y = Math.min(91, Math.max(9, ((event.clientY - drag.rect.top) / drag.rect.height) * 100));
    drag.moved = true;
    if (drag.type === "project") {
      setProjects((items) => items.map((item) => item.id === drag.id ? { ...item, x, y } : item));
    } else if (drag.type === "theme") {
      setAllThemes((items) => items.map((item) => item.id === drag.id ? { ...item, x, y } : item));
    } else {
      setLiterature((items) => items.map((item) => item.id === drag.id ? { ...item, x, y } : item));
    }
  }

  function endNodeDrag(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.moved) lastDraggedRef.current = { id: drag.id };
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    setDraggingNode("");
  }

  function clickWasDrag(id: string) {
    const last = lastDraggedRef.current;
    if (last?.id !== id) return false;
    lastDraggedRef.current = null;
    return true;
  }

  function openProject(project: ResearchProject) {
    const firstTheme = allThemes.find((theme) => theme.projectId === project.id);
    setActiveProjectId(project.id);
    setSelectedThemeId(firstTheme?.id ?? "");
    setSelectedLiteratureId(null);
    setProjectView("map");
    setMode("map");
    setProjects((items) => items.map((item) => item.id === project.id ? { ...item, updatedAt: "刚刚" } : item));
  }

  function createProject() {
    const name = window.prompt("新论文项目名称");
    if (!name?.trim()) return;
    const id = `project-${Date.now()}`;
    const project: ResearchProject = {
      id,
      name: name.trim(),
      shortName: name.trim().length > 8 ? `${name.trim().slice(0, 8)}…` : name.trim(),
      description: "新的论文研究项目",
      updatedAt: "刚刚",
      pinned: false,
      color: "apricot",
      tags: [],
      x: 50,
      y: 52,
    };
    setProjects((items) => [project, ...items]);
    setActiveProjectId(id);
    setSelectedThemeId("");
    setSelectedLiteratureId(null);
    setProjectView("map");
    setMode("map");
  }

  function deleteProject(project: ResearchProject) {
    const projectThemeIds = new Set(allThemes.filter((theme) => theme.projectId === project.id).map((theme) => theme.id));
    const projectLiteratureIds = literature.filter((item) => projectThemeIds.has(item.themeId)).map((item) => item.id);
    const message = `删除项目“${project.name}”？\n\n将同时删除 ${projectThemeIds.size} 个主题、${projectLiteratureIds.length} 篇文献及其阅读记录和本地 PDF。此操作无法撤销。`;
    if (!window.confirm(message)) return;
    const literatureIds = new Set(projectLiteratureIds);
    setProjects((items) => items.filter((item) => item.id !== project.id));
    setAllThemes((items) => items.filter((theme) => theme.projectId !== project.id));
    setLiterature((items) => items.filter((item) => !literatureIds.has(item.id)));
    setRecords((items) => items.filter((record) => !literatureIds.has(record.literatureId)));
    projectLiteratureIds.forEach((id) => void deleteStoredPdf(id).catch(() => undefined));
    notify("项目已删除");
  }

  function saveNodeEdit(values: NodeEditorValues) {
    if (!editTarget) return;
    if (editTarget.type === "project") {
      setProjects((items) => items.map((item) => item.id === editTarget.item.id ? {
        ...item,
        name: values.title,
        shortName: values.shortTitle || values.title,
        description: values.description,
        tags: values.tags,
        updatedAt: "刚刚",
      } : item));
      notify("项目资料已更新");
    } else if (editTarget.type === "theme") {
      setAllThemes((items) => items.map((item) => item.id === editTarget.item.id ? {
        ...item,
        name: values.title,
        description: values.description,
        tags: values.tags,
      } : item));
      notify("主题资料已更新");
    } else {
      setLiterature((items) => items.map((item) => item.id === editTarget.item.id ? {
        ...item,
        title: values.title,
        author: values.author,
        year: values.year,
        tags: values.tags,
      } : item));
      notify("文献资料已更新");
    }
    setEditTarget(null);
  }

  function deleteTheme(theme: Theme) {
    const themeLiteratureIds = literature.filter((item) => item.themeId === theme.id).map((item) => item.id);
    const message = `删除主题“${theme.name}”？\n\n将同时删除其中 ${themeLiteratureIds.length} 篇文献及其阅读记录和本地 PDF。此操作无法撤销。`;
    if (!window.confirm(message)) return;
    const literatureIds = new Set(themeLiteratureIds);
    setAllThemes((items) => items.filter((item) => item.id !== theme.id));
    setLiterature((items) => items.filter((item) => !literatureIds.has(item.id)));
    setRecords((items) => items.filter((record) => !literatureIds.has(record.literatureId)));
    themeLiteratureIds.forEach((id) => void deleteStoredPdf(id).catch(() => undefined));
    const nextTheme = themes.find((item) => item.id !== theme.id);
    setSelectedThemeId(nextTheme?.id ?? "");
    setSelectedLiteratureId(null);
    notify("主题已删除");
  }

  function deleteLiterature(item: Literature) {
    if (!window.confirm(`删除文献“${item.title}”？\n\n它的阅读记录和本地 PDF 也会被删除。此操作无法撤销。`)) return;
    setLiterature((items) => items.filter((literatureItem) => literatureItem.id !== item.id));
    setRecords((items) => items.filter((record) => record.literatureId !== item.id));
    void deleteStoredPdf(item.id).catch(() => undefined);
    setSelectedLiteratureId(null);
    notify("文献已删除");
  }

  function openLiterature(item: Literature) {
    setSelectedThemeId(item.themeId);
    setSelectedLiteratureId(item.id);
    const nextAnalysis = createMockAnalysis(item.id);
    setAnalysis(nextAnalysis);
    setActiveSectionId(nextAnalysis.sections[0].id);
  }

  function enterStudy() {
    setMode("study");
    const firstKind = recordKinds.find((item) => currentRecords.some((record) => record.kind === item.kind));
    setActiveKind(firstKind?.kind ?? "理论");
  }

  function openLiteratureFromMatrix(item: Literature, kind?: RecordKind) {
    openLiterature(item);
    if (kind) setActiveKind(kind);
    setMode("study");
  }

  function reanalyze() {
    if (!selectedLiterature || analyzing) return;
    setAnalyzing(true);
    notify(aiReady ? `正在通过 ${aiConnectionName(aiSettings)} 分析文献` : "当前继续使用原型摘要；可在设置中连接真实 AI");
    window.setTimeout(() => {
      setAnalysis(createMockAnalysis(selectedLiterature.id, new Date().toISOString()));
      setAnalyzing(false);
      notify("AI 摘要已重新生成");
    }, 1100);
  }

  function updateStatus(status: ReadingStatus) {
    if (!selectedLiterature) return;
    setLiterature((items) => items.map((item) => item.id === selectedLiterature.id ? { ...item, status } : item));
    notify(`阅读状态已改为${status}`);
  }

  function addTheme() {
    const name = window.prompt("新主题名称");
    if (!name?.trim()) return;
    const id = `theme-${Date.now()}`;
    const index = themes.length;
    const centerX = currentProject?.x ?? 50;
    const centerY = currentProject?.y ?? 52;
    const angle = -Math.PI / 2 + index * 2.18;
    const x = Math.min(88, Math.max(12, centerX + Math.cos(angle) * 30));
    const y = Math.min(86, Math.max(17, centerY + Math.sin(angle) * 30));
    setAllThemes((items) => [...items, { id, projectId: activeProjectId, name: name.trim(), description: "等待补充主题说明", tags: [], x, y }]);
    setSelectedThemeId(id);
    setSelectedLiteratureId(null);
    notify("主题已创建并保存在本机");
  }

  async function addLiteratureFromPdf(event: ChangeEvent<HTMLInputElement>) {
    if (!selectedTheme) return;
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      notify("请选择 PDF 文件");
      return;
    }
    if (file.size > 120 * 1024 * 1024) {
      notify("当前版本支持不超过 120 MB 的 PDF");
      return;
    }
    const title = file.name.replace(/\.pdf$/i, "").replace(/[_]+/g, " ").trim();
    const detectedYear = title.match(/(?:19|20)\d{2}/)?.[0] ?? "待补";
    const id = `lit-${window.crypto.randomUUID()}`;
    const count = themeLiterature.length;
    const angle = -Math.PI / 2 + count * 1.9;
    const item: Literature = {
      id,
      themeId: selectedTheme.id,
      title,
      author: "待补作者",
      year: detectedYear,
      status: "粗读",
      tags: [selectedTheme.name],
      x: Math.min(91, Math.max(9, selectedTheme.x + Math.cos(angle) * 22)),
      y: Math.min(89, Math.max(12, selectedTheme.y + Math.sin(angle) * 22)),
    };
    try {
      await saveStoredPdf(id, file);
      setLiterature((items) => [...items, item]);
      openLiterature(item);
      notify("文献 PDF 已导入并建立节点");
    } catch {
      notify("PDF 导入失败，请重试");
    }
  }

  function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedLiterature) return;
    const data = new FormData(event.currentTarget);
    const next: ResearchRecord = {
      id: Date.now(),
      literatureId: selectedLiterature.id,
      kind: data.get("kind") as RecordKind,
      quote: String(data.get("quote") || ""),
      page: String(data.get("page") || "待补页码"),
      thought: String(data.get("thought") || "等待补充个人理解"),
      question: String(data.get("question") || "尚未关联研究问题"),
      chapter: String(data.get("chapter") || "尚未关联论文章节"),
    };
    setRecords((items) => [next, ...items]);
    setActiveKind(next.kind);
    setShowRecordForm(false);
    notify("记录已保存到本机");
  }

  function savePdfHighlight(draft: { quote: string; page: string; kind: RecordKind; thought: string }) {
    if (!selectedLiterature) return;
    const next: ResearchRecord = {
      id: Date.now(),
      literatureId: selectedLiterature.id,
      kind: draft.kind,
      quote: draft.quote,
      page: draft.page,
      thought: draft.thought || "等待补充个人理解",
      question: "尚未关联研究问题",
      chapter: "尚未关联论文章节",
    };
    setRecords((items) => [next, ...items]);
    setActiveKind(next.kind);
    notify(`已保存为${next.kind}记录`);
  }

  return (
    <main className={`yanji-app ${mode === "study" ? "study-mode" : ""} ${mode === "home" ? "home-mode" : ""}`}>
      {mode !== "home" && <header className="app-topbar">
        <button className="brand" onClick={() => { setMode("home"); setHomeSection("library"); setSelectedLiteratureId(null); }} aria-label="返回项目首页">
          <span>研</span>
          <div><strong>研迹</strong><small>Literature Studio</small></div>
        </button>
        <div className="project-title">
          <small>论文项目</small>
          <strong>{currentProject?.name}</strong>
        </div>
        <div className="top-actions">
          <span className="save-status"><i /> 本地已保存</span>
          {mode === "map" && <div className="project-view-switch" aria-label="项目视图">
            <button className={projectView === "map" ? "active" : ""} onClick={() => { setProjectView("map"); setSelectedLiteratureId(null); }}>主题图谱</button>
            <button className={projectView === "matrix" ? "active" : ""} onClick={() => { setProjectView("matrix"); setSelectedLiteratureId(null); }}>研究矩阵</button>
          </div>}
          {mode === "map" && projectView === "map" && <button className="ghost-button" onClick={addTheme}>＋ 新建主题</button>}
          {mode === "map" && projectView === "map" && currentProject && <button className="ghost-button" onClick={() => setEditTarget({ type: "project", item: currentProject })}>编辑项目</button>}
          {mode === "map" && projectView === "map" && selectedTheme && <button className="ghost-button" onClick={() => setEditTarget({ type: "theme", item: selectedTheme })}>编辑主题</button>}
          {mode === "map" && projectView === "map" && selectedTheme && <button className="danger-button" onClick={() => deleteTheme(selectedTheme)}>删除当前主题</button>}
          {mode === "map" && projectView === "map" && <button className="dark-button" onClick={() => literatureFileInputRef.current?.click()} disabled={!selectedTheme}>＋ 导入文献 PDF</button>}
          {mode === "study" && <button className="dark-button" onClick={() => setShowRecordForm(true)}>＋ 新建记录</button>}
        </div>
      </header>}
      <input ref={literatureFileInputRef} className="hidden-file-input" type="file" accept="application/pdf,.pdf" onChange={(event) => void addLiteratureFromPdf(event)} />

      {mode === "home" ? (
        <ProjectHome
          section={homeSection}
          projects={projects}
          themes={allThemes}
          literature={literature}
          onOpenProject={openProject}
          onCreateProject={createProject}
          onSectionChange={setHomeSection}
          onEditProject={(project) => setEditTarget({ type: "project", item: project })}
          onDeleteProject={deleteProject}
          settings={<SettingsCenter appearance={mapAppearance} aiSettings={aiSettings} cloudSettings={cloudSettings} hasSessionCredential={hasSessionCredential} onAppearanceChange={setMapAppearance} onSaveAi={saveAiConnection} onSaveCloud={saveCloudConnection} onNotify={notify} />}
          account={<AccountCenter onNotify={notify} />}
        />
      ) : mode === "map" && projectView === "map" ? (
        <section className={`map-workspace map-bg-${mapAppearance.background} map-line-${mapAppearance.line}`}>
          <div className="map-intro">
            <span className="eyebrow">主题与文献关系图</span>
            <h1>从主题进入你的文献</h1>
            <p>单击主题查看关联文献，双击项目或主题打开资料卡；点击文献查看 AI 摘要。所有节点都可以拖动调整位置。</p>
          </div>

          <div className={`knowledge-map map-bg-${mapAppearance.background} ${selectedLiterature ? "drawer-open" : ""}`}>
            <svg className="map-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {themes.map((theme) => <line key={`project-${theme.id}`} x1={projectX} y1={projectY} x2={theme.x} y2={theme.y} />)}
              {selectedTheme && themeLiterature.map((item) => <line className="literature-line" key={`theme-${item.id}`} x1={selectedTheme.x} y1={selectedTheme.y} x2={item.x} y2={item.y} />)}
            </svg>

            <button
              className={`project-node draggable-node ${draggingNode === activeProjectId ? "dragging" : ""}`}
              style={{ left: `${projectX}%`, top: `${projectY}%` }}
              onClick={() => { clickWasDrag(activeProjectId); }}
              onDoubleClick={() => {
                if (clickWasDrag(activeProjectId) || !currentProject) return;
                setEditTarget({ type: "project", item: currentProject });
              }}
              onPointerDown={(event) => beginNodeDrag(event, "project", activeProjectId)}
              onPointerMove={moveNode}
              onPointerUp={endNodeDrag}
              onPointerCancel={endNodeDrag}
              title="双击打开项目资料卡 · 拖动调整位置"
            >
              <span>论文项目</span><strong>{currentProject?.shortName}</strong><small>{themes.length} 个主题 · {currentProjectLiterature.length} 篇文献</small>
              <em className="node-tags">{currentProject?.tags.slice(0, 2).map((tag) => <i key={tag}>#{tag}</i>)}</em>
            </button>

            {themes.map((theme) => (
              <div
                key={theme.id}
                className={`map-node-frame theme-node-frame ${theme.id === selectedThemeId ? "active" : ""} ${draggingNode === theme.id ? "dragging" : ""}`}
                style={{ left: `${theme.x}%`, top: `${theme.y}%` }}
              >
                <button
                  className={`theme-node draggable-node ${theme.id === selectedThemeId ? "active" : ""} ${draggingNode === theme.id ? "dragging" : ""}`}
                  onClick={() => { if (clickWasDrag(theme.id)) return; setSelectedThemeId(theme.id); setSelectedLiteratureId(null); }}
                  onDoubleClick={() => {
                    if (clickWasDrag(theme.id)) return;
                    setEditTarget({ type: "theme", item: theme });
                  }}
                  onPointerDown={(event) => beginNodeDrag(event, "theme", theme.id)}
                  onPointerMove={moveNode}
                  onPointerUp={endNodeDrag}
                  onPointerCancel={endNodeDrag}
                  title={`${theme.name} · 双击打开主题资料卡 · 拖动调整位置`}
                >
                  <span>{theme.name.slice(0, 1)}</span>
                  <div><strong>{theme.name}</strong><small>{literature.filter((item) => item.themeId === theme.id).length} 篇文献</small><em className="node-tags">{theme.tags.slice(0, 2).map((tag) => <i key={tag}>#{tag}</i>)}</em></div>
                </button>
                <button className="map-node-delete" onClick={() => deleteTheme(theme)} aria-label={`删除主题 ${theme.name}`} title="删除主题">×</button>
              </div>
            ))}

            {themeLiterature.map((item) => (
              <div
                key={item.id}
                className={`map-node-frame literature-node-frame ${item.id === selectedLiteratureId ? "active" : ""} ${draggingNode === item.id ? "dragging" : ""}`}
                style={{ left: `${item.x}%`, top: `${item.y}%` }}
              >
                <button
                  className={`literature-node draggable-node ${item.id === selectedLiteratureId ? "active" : ""} ${draggingNode === item.id ? "dragging" : ""}`}
                  onClick={() => { if (clickWasDrag(item.id)) return; openLiterature(item); }}
                  onPointerDown={(event) => beginNodeDrag(event, "literature", item.id)}
                  onPointerMove={moveNode}
                  onPointerUp={endNodeDrag}
                  onPointerCancel={endNodeDrag}
                  title={`${item.title} · 拖动调整位置`}
                >
                  <span>{item.author.slice(0, 1)}</span>
                  <div><strong>{item.author}</strong><small>{item.year} · {item.status}</small><em className="node-tags">{item.tags.slice(0, 2).map((tag) => <i key={tag}>#{tag}</i>)}</em></div>
                </button>
                <button className="map-node-delete" onClick={() => deleteLiterature(item)} aria-label={`删除文献 ${item.title}`} title="删除文献">×</button>
              </div>
            ))}

            <div className="map-legend">
              <span><i className="theme-dot" />主题</span>
              <span><i className="lit-dot" />文献</span>
              <span>当前主题：<b>{selectedTheme?.name ?? "尚未创建"}</b></span>
            </div>
            {!themes.length && <div className="empty-map"><span>从第一个主题开始</span><p>这个项目还没有主题。先创建研究主题，再向主题添加文献。</p><button onClick={addTheme}>＋ 创建第一个主题</button></div>}
          </div>

          {selectedLiterature && (
            <SummaryDrawer
              literature={selectedLiterature}
              analysis={analysis}
              activeSection={activeSection}
              activeSectionId={activeSectionId}
              analyzing={analyzing}
              onClose={() => setSelectedLiteratureId(null)}
              onEnter={enterStudy}
              onReanalyze={reanalyze}
              onSectionChange={setActiveSectionId}
              onStatusChange={updateStatus}
              aiConnectionLabel={aiConnectionName(aiSettings)}
              aiReady={aiReady}
              onAiSettings={() => { setMode("home"); setHomeSection("settings"); }}
              onEdit={() => setEditTarget({ type: "literature", item: selectedLiterature })}
              onDelete={() => deleteLiterature(selectedLiterature)}
            />
          )}
        </section>
      ) : mode === "map" && projectView === "matrix" ? (
        <ResearchMatrix
          project={currentProject}
          themes={themes}
          literature={currentProjectLiterature}
          records={records.filter((record) => currentProjectLiterature.some((item) => item.id === record.literatureId))}
          onPreviewLiterature={(item) => { openLiterature(item); setProjectView("map"); }}
          onOpenLiterature={openLiteratureFromMatrix}
          onAiAssist={useAiEntry}
        />
      ) : selectedLiterature ? (
        <StudyView
          literature={selectedLiterature}
          records={visibleRecords}
          counts={counts}
          activeKind={activeKind}
          onKindChange={setActiveKind}
          onBack={() => setMode("map")}
          onAdd={() => setShowRecordForm(true)}
          allRecords={currentRecords}
          showRecordForm={showRecordForm}
          onCloseRecordForm={() => setShowRecordForm(false)}
          onSaveRecord={saveRecord}
          onAiAssist={useAiEntry}
          onSaveHighlight={savePdfHighlight}
          onNotify={notify}
        />
      ) : null}

      {editTarget && <NodeEditor key={`${editTarget.type}-${editTarget.item.id}`} target={editTarget} onClose={() => setEditTarget(null)} onSave={saveNodeEdit} />}
      {toast && <div className="toast"><span>✓</span>{toast}</div>}
    </main>
  );
}

function ResearchMatrix({ project, themes, literature, records, onPreviewLiterature, onOpenLiterature, onAiAssist }: {
  project?: ResearchProject;
  themes: Theme[];
  literature: Literature[];
  records: ResearchRecord[];
  onPreviewLiterature: (literature: Literature) => void;
  onOpenLiterature: (literature: Literature, kind?: RecordKind) => void;
  onAiAssist: (action: string) => void;
}) {
  const [view, setView] = useState<"records" | "literature">("records");
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<"全部" | RecordKind>("全部");
  const [themeFilter, setThemeFilter] = useState("全部");
  const [onlyUnlinked, setOnlyUnlinked] = useState(false);
  const [selected, setSelected] = useState<{ type: "record"; id: number } | { type: "literature"; id: string } | null>(null);

  const literatureById = useMemo(() => new Map(literature.map((item) => [item.id, item])), [literature]);
  const themesById = useMemo(() => new Map(themes.map((item) => [item.id, item])), [themes]);
  const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
  const isPlaceholder = (value: string) => !value || value.startsWith("尚未") || value.startsWith("等待") || value.startsWith("未关联");

  const filteredRecords = useMemo(() => records.filter((record) => {
    const paper = literatureById.get(record.literatureId);
    if (!paper) return false;
    const theme = themesById.get(paper.themeId);
    if (kindFilter !== "全部" && record.kind !== kindFilter) return false;
    if (themeFilter !== "全部" && paper.themeId !== themeFilter) return false;
    if (onlyUnlinked && !isPlaceholder(record.chapter)) return false;
    if (!normalizedQuery) return true;
    return [record.quote, record.thought, record.question, record.chapter, record.kind, paper.title, paper.author, theme?.name ?? ""]
      .join(" ").toLocaleLowerCase("zh-CN").includes(normalizedQuery);
  }), [records, literatureById, themesById, kindFilter, themeFilter, onlyUnlinked, normalizedQuery]);

  const filteredLiterature = useMemo(() => literature.filter((paper) => {
    if (themeFilter !== "全部" && paper.themeId !== themeFilter) return false;
    if (!normalizedQuery) return true;
    const theme = themesById.get(paper.themeId);
    const paperRecords = records.filter((record) => record.literatureId === paper.id);
    return [paper.title, paper.author, paper.year, paper.status, paper.tags.join(" "), theme?.name ?? "", ...paperRecords.flatMap((record) => [record.quote, record.thought])]
      .join(" ").toLocaleLowerCase("zh-CN").includes(normalizedQuery);
  }), [literature, records, themesById, themeFilter, normalizedQuery]);

  const selectedRecord = selected?.type === "record" ? records.find((record) => record.id === selected.id) ?? null : null;
  const selectedPaper = selected?.type === "literature"
    ? literatureById.get(selected.id) ?? null
    : selectedRecord ? literatureById.get(selectedRecord.literatureId) ?? null : null;
  const linkedChapters = new Set(records.map((record) => record.chapter).filter((chapter) => !isPlaceholder(chapter)));
  const linkedQuestions = new Set(records.map((record) => record.question).filter((question) => !isPlaceholder(question)));

  function countsFor(paperId: string) {
    const paperRecords = records.filter((record) => record.literatureId === paperId);
    return recordKinds.map(({ kind }) => ({ kind, count: paperRecords.filter((record) => record.kind === kind).length })).filter((item) => item.count);
  }

  return (
    <section className={`matrix-workspace ${selected ? "detail-open" : ""}`}>
      <header className="matrix-hero">
        <div><span className="eyebrow">PROJECT RESEARCH MATRIX</span><h1>把阅读积累变成写作素材</h1><p>{project?.name}中的主题、文献和记录都来自同一份数据；在图谱中探索关系，在这里检索理论、证据与章节素材。</p></div>
        <div className="matrix-overview">
          <span><strong>{themes.length}</strong><small>主题</small></span>
          <span><strong>{literature.length}</strong><small>文献</small></span>
          <span><strong>{records.length}</strong><small>记录</small></span>
          <span><strong>{linkedChapters.size}</strong><small>已关联章节</small></span>
        </div>
      </header>

      <div className="matrix-toolbar">
        <div className="matrix-tabs">
          <button className={view === "records" ? "active" : ""} onClick={() => { setView("records"); setSelected(null); }}>记录视图 <span>{records.length}</span></button>
          <button className={view === "literature" ? "active" : ""} onClick={() => { setView("literature"); setSelected(null); }}>文献视图 <span>{literature.length}</span></button>
        </div>
        <label className="matrix-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索理论、原文、个人理解、作者或章节…" /></label>
        <select value={themeFilter} onChange={(event) => setThemeFilter(event.target.value)} aria-label="按主题筛选">
          <option value="全部">全部主题</option>
          {themes.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}
        </select>
        <button className="matrix-ai" onClick={() => onAiAssist("归纳项目研究矩阵")}>AI 归纳</button>
      </div>

      {view === "records" && <div className="matrix-filters">
        <div><button className={kindFilter === "全部" ? "active" : ""} onClick={() => setKindFilter("全部")}>全部记录</button>{recordKinds.map(({ kind }) => <button key={kind} className={kindFilter === kind ? "active" : ""} onClick={() => setKindFilter(kind)}>{kind}<span>{records.filter((record) => record.kind === kind).length}</span></button>)}</div>
        <label><input type="checkbox" checked={onlyUnlinked} onChange={(event) => setOnlyUnlinked(event.target.checked)} />只看未关联论文章节</label>
      </div>}

      <div className="matrix-content">
        <div className="matrix-table-wrap">
          {view === "records" ? <table className="research-table record-table">
            <thead><tr><th>类型</th><th>可用于写作的内容</th><th>来源文献</th><th>主题</th><th>页码</th><th>关联位置</th></tr></thead>
            <tbody>{filteredRecords.map((record) => {
              const paper = literatureById.get(record.literatureId);
              const theme = paper ? themesById.get(paper.themeId) : null;
              return <tr key={record.id} className={selectedRecord?.id === record.id ? "selected" : ""} onClick={() => setSelected({ type: "record", id: record.id })}>
                <td><span className={`kind-badge kind-${record.kind}`}>{record.kind}</span></td>
                <td><strong>{record.quote}</strong><small>{record.thought}</small></td>
                <td><b>{paper?.author}</b><small>{paper?.title}</small></td>
                <td><span className="theme-label">{theme?.name ?? "未分类"}</span></td>
                <td>{record.page}</td>
                <td><b>{isPlaceholder(record.chapter) ? "未关联章节" : record.chapter}</b><small>{isPlaceholder(record.question) ? "未关联研究问题" : record.question}</small></td>
              </tr>;
            })}</tbody>
          </table> : <table className="research-table literature-table">
            <thead><tr><th>文献</th><th>主题</th><th>阅读状态</th><th>标签</th><th>已有研究记录</th><th>写作关联</th></tr></thead>
            <tbody>{filteredLiterature.map((paper) => {
              const paperRecords = records.filter((record) => record.literatureId === paper.id);
              const chapters = new Set(paperRecords.map((record) => record.chapter).filter((chapter) => !isPlaceholder(chapter)));
              return <tr key={paper.id} className={selectedPaper?.id === paper.id ? "selected" : ""} onClick={() => setSelected({ type: "literature", id: paper.id })}>
                <td><strong>{paper.title}</strong><small>{paper.author} · {paper.year}</small></td>
                <td><span className="theme-label">{themesById.get(paper.themeId)?.name ?? "未分类"}</span></td>
                <td><span className={`status-label status-${paper.status}`}>{paper.status}</span></td>
                <td><div className="matrix-tags">{paper.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div></td>
                <td><div className="record-counts">{countsFor(paper.id).length ? countsFor(paper.id).map((item) => <span key={item.kind}>{item.kind} {item.count}</span>) : <small>暂无记录</small>}</div></td>
                <td><b>{chapters.size} 个章节</b><small>{paperRecords.length} 条可用素材</small></td>
              </tr>;
            })}</tbody>
          </table>}
          {((view === "records" && !filteredRecords.length) || (view === "literature" && !filteredLiterature.length)) && <div className="matrix-empty"><span>检</span><strong>没有符合当前条件的内容</strong><p>可以清除搜索词或调整筛选条件；新建的文献记录会自动出现在这里。</p></div>}
        </div>

        {selected && selectedPaper && <aside className="matrix-detail">
          <header><div><span>{selectedRecord ? `${selectedRecord.kind}记录` : "文献概览"}</span><h2>{selectedRecord ? selectedRecord.quote : selectedPaper.title}</h2></div><button onClick={() => setSelected(null)} aria-label="关闭详情">×</button></header>
          <div className="matrix-source"><i>{selectedPaper.author.slice(0, 1)}</i><span><strong>{selectedPaper.author} · {selectedPaper.year}</strong><small>{themesById.get(selectedPaper.themeId)?.name} · {selectedPaper.status}</small></span></div>
          {selectedRecord ? <>
            <section><span>重要原文</span><blockquote>“{selectedRecord.quote}”</blockquote><small>{selectedRecord.page}</small></section>
            <section><span>我的理解</span><p>{selectedRecord.thought}</p></section>
            <div className="matrix-detail-links"><span><small>研究问题</small>{selectedRecord.question}</span><span><small>论文章节</small>{selectedRecord.chapter}</span></div>
          </> : <>
            <section><span>当前积累</span><p>这篇文献已有 {records.filter((record) => record.literatureId === selectedPaper.id).length} 条结构化记录，涉及 {countsFor(selectedPaper.id).map((item) => item.kind).join("、") || "尚未分类"}。</p></section>
            <div className="matrix-detail-tags">{selectedPaper.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
          </>}
          <div className="matrix-detail-actions">
            <button onClick={() => onPreviewLiterature(selectedPaper)}>查看 AI 摘要</button>
            <button className="dark-button" onClick={() => onOpenLiterature(selectedPaper, selectedRecord?.kind)}>打开文献{selectedRecord ? ` · ${selectedRecord.page}` : ""}</button>
          </div>
          <button className="matrix-detail-ai" onClick={() => onAiAssist(selectedRecord ? "分析这条写作素材" : "归纳这篇文献的已有记录")}>AI 帮我整理这部分</button>
        </aside>}
      </div>

      <footer className="matrix-footnote"><span>当前矩阵覆盖 {filteredRecords.length} 条记录 · {linkedQuestions.size} 个研究问题</span><p>阅读区新增的划线和记录会自动进入矩阵，无需再次整理或复制。</p></footer>
    </section>
  );
}

function ProjectHome({ section, projects, themes, literature, settings, account, onOpenProject, onCreateProject, onSectionChange, onEditProject, onDeleteProject }: {
  section: "library" | "settings" | "account";
  projects: ResearchProject[];
  themes: Theme[];
  literature: Literature[];
  settings: ReactNode;
  account: ReactNode;
  onOpenProject: (project: ResearchProject) => void;
  onCreateProject: () => void;
  onSectionChange: (section: "library" | "settings" | "account") => void;
  onEditProject: (project: ResearchProject) => void;
  onDeleteProject: (project: ResearchProject) => void;
}) {
  return (
    <section className="project-home">
      <aside className="home-sidebar">
        <div className="home-brand"><span>研</span><div><strong>研迹</strong><small>Literature Studio</small></div></div>
        <nav className="home-nav">
          <button className={section === "library" ? "active" : ""} onClick={() => onSectionChange("library")}><i>始</i><span>开始</span></button>
          <button><i>近</i><span>最近项目</span><b>{projects.length}</b></button>
          <button><i>固</i><span>已固定</span><b>{projects.filter((project) => project.pinned).length}</b></button>
          <button className={section === "settings" ? "active" : ""} onClick={() => onSectionChange("settings")}><i>设</i><span>设置</span></button>
          <button className={section === "account" ? "active" : ""} onClick={() => onSectionChange("account")}><i>账</i><span>账户与同步</span></button>
        </nav>
        <button className="home-account-entry" onClick={() => onSectionChange("account")}><i>人</i><span><strong>登录 / 创建账户</strong><small>本地使用无需登录</small></span><b>›</b></button>
        <div className="home-local-status"><i /><div><strong>数据保存在本机</strong><small>每个项目独立保存</small></div></div>
      </aside>

      <div className={`home-content ${section !== "library" ? "settings-content" : ""}`}>
        {section === "settings" ? settings : section === "account" ? account : <>
        <header className="home-welcome">
          <span className="eyebrow">YOUR RESEARCH LIBRARY</span>
          <h1>从一个论文项目开始</h1>
          <p>每个项目拥有自己的主题、文献图谱和阅读记录。</p>
        </header>

        <section className="quick-start">
          <div className="section-heading"><div><h2>新建</h2><p>创建一个独立的研究空间</p></div></div>
          <button className="new-project-card" onClick={onCreateProject}>
            <span>＋</span><div><strong>空白论文项目</strong><small>从主题和研究问题开始</small></div>
          </button>
          <div className="start-note"><span>01</span><p>创建项目后，先建立主题，再把文献放进相应主题。</p></div>
        </section>

        <section className="recent-projects">
          <div className="section-heading"><div><h2>最近项目</h2><p>继续上次的研究进度</p></div><span>{projects.length} 个项目</span></div>
          <div className="project-grid">
            {projects.map((project) => {
              const projectThemes = themes.filter((theme) => theme.projectId === project.id);
              const projectThemeIds = new Set(projectThemes.map((theme) => theme.id));
              const projectLiterature = literature.filter((item) => projectThemeIds.has(item.themeId));
              return (
                <article className="project-card" key={project.id}>
                  <button className="project-card-main" onClick={() => onOpenProject(project)}>
                    <div className={`project-cover ${project.color}`}>
                      <span>研迹</span><strong>{project.shortName}</strong><small>Research Project</small>
                    </div>
                    <div className="project-card-body">
                      <div className="project-name-row"><h3>{project.name}</h3>{project.pinned && <span>已固定</span>}</div>
                      <p>{project.description}</p>
                      <div className="project-card-tags">{project.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
                      <div className="project-stats"><span>{projectThemes.length} 个主题</span><span>{projectLiterature.length} 篇文献</span><span>{project.updatedAt}编辑</span></div>
                    </div>
                    <b className="open-project-arrow">→</b>
                  </button>
                  <div className="project-card-actions">
                    <button onClick={() => onEditProject(project)} aria-label={`编辑项目 ${project.name}`}>编辑</button>
                    <button className="delete-project-button" onClick={() => onDeleteProject(project)} aria-label={`删除项目 ${project.name}`}>删除</button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
        </>}
      </div>
    </section>
  );
}

function AccountCenter({ onNotify }: { onNotify: (message: string) => void }) {
  function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") || "").trim();
    if (!email) return;
    onNotify("登录入口已就绪；正式账户认证将在桌面封装阶段接入");
  }

  return <section className="account-center">
    <header className="settings-header"><span className="eyebrow">ACCOUNT & SYNC</span><h1>账户与同步</h1><p>登录是可选能力。即使不登录，你仍然可以完整使用项目、PDF、图谱、研究矩阵和本地记录。</p></header>
    <div className="account-layout">
      <section className="account-login-card">
        <div className="account-card-heading"><i>人</i><span><small>未来云端账户</small><h2>登录研迹</h2><p>用于跨设备同步、云端备份和账户级 AI 服务。</p></span></div>
        <form onSubmit={submitLogin}>
          <label>邮箱地址<input type="email" name="email" placeholder="name@example.com" required /></label>
          <button className="dark-button" type="submit">继续登录</button>
        </form>
        <div className="login-separator"><span>或</span></div>
        <div className="provider-buttons"><button onClick={() => onNotify("Apple 登录将在桌面封装阶段接入")}>使用 Apple 登录</button><button onClick={() => onNotify("第三方登录将在账户服务阶段接入")}>其他登录方式</button></div>
        <p className="account-stage-note">目前这是正式产品入口与交互位置，尚未连接账户服务器，不会上传你的项目或 PDF。</p>
      </section>
      <div className="account-principles">
        <section><span>当前状态</span><h3>本地模式</h3><p>数据仍保存在当前电脑，账户不可用时也能继续阅读与写作。</p><b><i />无需登录即可使用</b></section>
        <section><span>登录后可扩展</span><ul><li><i>同</i><div><strong>跨设备同步</strong><small>同步项目结构与研究记录</small></div></li><li><i>备</i><div><strong>加密备份</strong><small>PDF 是否上传由你单独决定</small></div></li><li><i>AI</i><div><strong>账户级 AI</strong><small>统一管理额度与分析历史</small></div></li></ul></section>
        <section className="account-boundary"><span>产品边界</span><p>账户只负责身份和可选同步；本地资料库始终是独立能力。后续封装时将把登录凭证放进 macOS 钥匙串，而不是写入项目文件。</p></section>
      </div>
    </div>
  </section>;
}

function SummaryDrawer({ literature, analysis, activeSection, activeSectionId, analyzing, aiConnectionLabel, aiReady, onClose, onEnter, onReanalyze, onSectionChange, onStatusChange, onAiSettings, onEdit, onDelete }: {
  literature: Literature;
  analysis: AnalysisResult;
  activeSection: AnalysisSection;
  activeSectionId: string;
  analyzing: boolean;
  aiConnectionLabel: string;
  aiReady: boolean;
  onClose: () => void;
  onEnter: () => void;
  onReanalyze: () => void;
  onSectionChange: (id: string) => void;
  onStatusChange: (status: ReadingStatus) => void;
  onAiSettings: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <aside className="summary-drawer">
      <div className="drawer-head">
        <span className="drawer-kicker">LITERATURE PREVIEW</span>
        <div className="drawer-head-actions"><button className="edit-literature-button" onClick={onEdit}>编辑信息与标签</button><button className="delete-literature-button" onClick={onDelete}>删除文献</button><button className="icon-button" onClick={onClose} aria-label="关闭文献预览">×</button></div>
      </div>
      <div className="literature-heading">
        <div className="paper-mark">{literature.author.slice(0, 1)}</div>
        <div><h2>{literature.title}</h2><p>{literature.author} · {literature.year}</p></div>
      </div>
      <div className="metadata-row">
        <select value={literature.status} onChange={(event) => onStatusChange(event.target.value as ReadingStatus)} aria-label="阅读状态">
          {statusOptions.map((status) => <option key={status}>{status}</option>)}
        </select>
        {literature.tags.map((tag) => <span key={tag}>#{tag}</span>)}
      </div>

      <button className="enter-records" onClick={onEnter}>
        <span><small>打开记录区与 PDF 阅读区</small><strong>打开文献</strong></span><b>→</b>
      </button>

      <div className="ai-status">
        <div><i className={analyzing ? "pulse" : ""}>AI</i><span><strong>{analyzing ? "正在重新分析…" : "AI 文献摘要"}</strong><small>{analyzing ? "正在识别文章结构" : `${aiReady ? aiConnectionLabel : "原型摘要"} · ${new Date(analysis.generatedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`}</small></span></div>
        <div className="ai-status-actions"><button onClick={onAiSettings}>{aiReady ? "连接设置" : "连接 AI"}</button><button onClick={onReanalyze} disabled={analyzing}>{analyzing ? "分析中" : "重新分析"}</button></div>
      </div>

      <section className="purpose-card">
        <span>这篇文献是做什么的</span>
        <p>{analysis.purpose}</p>
      </section>

      <div className="section-tabs" role="tablist">
        {analysis.sections.map((section) => (
          <button key={section.id} className={activeSectionId === section.id ? "active" : ""} onClick={() => onSectionChange(section.id)} role="tab">{section.label}</button>
        ))}
      </div>

      <section className="section-analysis">
        <div className="analysis-block">
          <span>该部分说了什么</span>
          <p>{activeSection.summary}</p>
        </div>
        <div className="analysis-block learnable">
          <span>有什么好的地方值得借鉴</span>
          <ul>{activeSection.learnablePoints.map((point) => <li key={point}>{point}</li>)}</ul>
        </div>
        <footer><span>来源页码：{activeSection.pages.join("、")}</span><span className={`confidence ${activeSection.confidence}`}>{activeSection.confidence === "high" ? "高" : activeSection.confidence === "medium" ? "中" : "低"}置信度</span></footer>
      </section>
      <p className="ai-disclaimer">AI 内容用于辅助定位，请进入文献记录中的 PDF 阅读页结合原文核对。</p>
    </aside>
  );
}

function StudyView({ literature, records, allRecords, counts, activeKind, showRecordForm, onKindChange, onBack, onAdd, onCloseRecordForm, onSaveRecord, onAiAssist, onSaveHighlight, onNotify }: {
  literature: Literature;
  records: ResearchRecord[];
  allRecords: ResearchRecord[];
  counts: Record<RecordKind, number>;
  activeKind: RecordKind;
  showRecordForm: boolean;
  onKindChange: (kind: RecordKind) => void;
  onBack: () => void;
  onAdd: () => void;
  onCloseRecordForm: () => void;
  onSaveRecord: (event: FormEvent<HTMLFormElement>) => void;
  onAiAssist: (action: string) => void;
  onSaveHighlight: (draft: { quote: string; page: string; kind: RecordKind; thought: string }) => void;
  onNotify: (message: string) => void;
}) {
  const [recordPaneWidth, setRecordPaneWidth] = useState(470);
  const workspaceRef = useRef<HTMLElement>(null);
  const resizeRef = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    void loadWorkspaceValue("yanji-record-pane-width", 470).then((width) => setRecordPaneWidth(Math.min(720, Math.max(360, width))));
  }, []);

  function beginResize(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeRef.current = { pointerId: event.pointerId, startX: event.clientX, startWidth: recordPaneWidth };
  }

  function resizePanes(event: ReactPointerEvent<HTMLDivElement>) {
    const resize = resizeRef.current;
    const workspace = workspaceRef.current;
    if (!resize || resize.pointerId !== event.pointerId || !workspace) return;
    const available = workspace.getBoundingClientRect().width;
    const maximum = Math.max(360, available - 104 - 520 - 8);
    setRecordPaneWidth(Math.min(maximum, Math.max(360, resize.startWidth + event.clientX - resize.startX)));
  }

  function endResize(event: ReactPointerEvent<HTMLDivElement>) {
    const resize = resizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    resizeRef.current = null;
    void saveWorkspaceValue("yanji-record-pane-width", recordPaneWidth);
  }

  function resizeWithKeyboard(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowLeft" ? -24 : 24;
    setRecordPaneWidth((width) => Math.min(720, Math.max(360, width + direction)));
  }

  return (
    <section ref={workspaceRef} className="study-workspace" style={{ "--record-pane-width": `${recordPaneWidth}px` } as CSSProperties}>
      <aside className="study-rail">
        <button className="rail-back" onClick={onBack}><i>←</i><span>摘要</span></button>
        <div className="rail-document" title={literature.title}><i>PDF</i><span>当前文献</span></div>
        <div className="record-nav-title"><span>记录类型</span><small>{Object.values(counts).reduce((sum, value) => sum + value, 0)}</small></div>
        <nav className="record-nav">
          {recordKinds.map((item) => (
            <button key={item.kind} className={activeKind === item.kind ? "active" : ""} onClick={() => onKindChange(item.kind)} title={`${item.kind}记录`}>
              <i>{item.mark}</i><strong>{item.kind}</strong><b>{counts[item.kind]}</b>
            </button>
          ))}
        </nav>
        <button className="rail-add" onClick={onAdd}><i>＋</i><span>新增记录</span></button>
      </aside>

      <section className="record-canvas">
        <header>
          <div className="record-heading"><span className="eyebrow">{literature.author} · {literature.year}</span><h2>{activeKind}记录</h2><p title={literature.title}>{literature.title}</p></div>
          <div className="record-header-actions"><button className="ghost-button" onClick={() => onAiAssist("整理当前文献记录")}>AI 整理</button><button className="dark-button" onClick={onAdd}>＋ 新增</button></div>
        </header>
        {showRecordForm && <InlineRecordForm literature={literature} defaultKind={activeKind} onClose={onCloseRecordForm} onSave={onSaveRecord} onAiAssist={() => onAiAssist("辅助填写文献记录")} />}
        {records.length ? (
          <div className="record-stack">
            {records.map((record) => (
              <article className="research-record" key={record.id}>
                <div className="record-top"><span>{record.kind}</span><small>{record.page}</small></div>
                <blockquote>“{record.quote}”</blockquote>
                <section><span>我的理解</span><p>{record.thought}</p></section>
                <div className="record-links"><span><small>研究问题</small>{record.question}</span><span><small>论文章节</small>{record.chapter}</span></div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-records"><span>{recordKinds.find((item) => item.kind === activeKind)?.mark}</span><h3>还没有{activeKind}记录</h3><p>阅读时先保存重要原文，再写下它为什么与你的研究有关。</p><button onClick={onAdd}>创建第一条记录</button></div>
        )}
      </section>

      <div className="study-divider" role="separator" aria-label="调整记录区与文献区宽度" aria-orientation="vertical" aria-valuenow={recordPaneWidth} tabIndex={0} onPointerDown={beginResize} onPointerMove={resizePanes} onPointerUp={endResize} onPointerCancel={endResize} onKeyDown={resizeWithKeyboard}><i /></div>

      <section className="study-document-pane" aria-label="PDF 文献阅读区">
        <PdfReader literatureId={literature.id} title={literature.title} records={allRecords} onAiAssist={() => onAiAssist("解读选中的原文")} onSaveHighlight={onSaveHighlight} onNotify={onNotify} />
      </section>
    </section>
  );
}

function NodeEditor({ target, onClose, onSave }: { target: NodeEditTarget; onClose: () => void; onSave: (values: NodeEditorValues) => void }) {
  const isProject = target.type === "project";
  const isTheme = target.type === "theme";
  const title = target.type === "literature" ? target.item.title : target.item.name;
  const description = target.type === "literature" ? "" : target.item.description;
  const shortTitle = target.type === "project" ? target.item.shortName : "";
  const author = target.type === "literature" ? target.item.author : "";
  const year = target.type === "literature" ? target.item.year : "";
  const label = isProject ? "项目" : isTheme ? "主题" : "文献";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const tags = String(data.get("tags") || "").split(/[,，]/).map((tag) => tag.trim().replace(/^#/, "")).filter(Boolean);
    onSave({
      title: String(data.get("title") || "").trim(),
      shortTitle: String(data.get("shortTitle") || "").trim(),
      description: String(data.get("description") || "").trim(),
      author: String(data.get("author") || "").trim(),
      year: String(data.get("year") || "").trim(),
      tags: Array.from(new Set(tags)).slice(0, 8),
    });
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form className="record-modal node-editor" onSubmit={submit}>
        <header><div><span>EDIT {label.toUpperCase()}</span><h2>编辑{label}信息</h2><p>名称与标签会同步显示在图谱节点上。</p></div><button type="button" onClick={onClose}>×</button></header>
        <label>{isProject ? "项目完整名称" : isTheme ? "主题名称" : "文献标题"}<input name="title" defaultValue={title} required autoFocus /></label>
        {isProject && <label>图谱中的简短名称<input name="shortTitle" defaultValue={shortTitle} required maxLength={18} /></label>}
        {(isProject || isTheme) && <label>说明<textarea name="description" defaultValue={description} placeholder={`补充${label}的研究范围与用途……`} /></label>}
        {target.type === "literature" && <div className="form-grid"><label>作者<input name="author" defaultValue={author} required /></label><label>年份<input name="year" defaultValue={year} required /></label></div>}
        <label>标签<input name="tags" defaultValue={target.item.tags.join("，")} placeholder="用逗号分隔，例如：核心理论，精读" /></label>
        <small className="editor-hint">最多保存 8 个标签；图谱节点优先展示前 2 个。</small>
        <footer><span>修改自动保存在本机</span><button type="button" onClick={onClose}>取消</button><button className="dark-button" type="submit">保存修改</button></footer>
      </form>
    </div>
  );
}

function InlineRecordForm({ literature, defaultKind, onClose, onSave, onAiAssist }: { literature: Literature; defaultKind: RecordKind; onClose: () => void; onSave: (event: FormEvent<HTMLFormElement>) => void; onAiAssist: () => void }) {
  return (
      <form className="inline-record-form" onSubmit={onSave}>
        <header><div><span>QUICK RESEARCH NOTE</span><h3>新增文献记录</h3><p>{literature.author} · {literature.year}</p></div><button type="button" onClick={onClose} aria-label="收起新增记录">×</button></header>
        <div className="form-grid">
          <label>记录类型<select name="kind" defaultValue={defaultKind}>{recordKinds.map((item) => <option key={item.kind}>{item.kind}</option>)}</select></label>
          <label>页码<input name="page" placeholder="例如 p. 12" /></label>
        </div>
        <label>重要原文<textarea name="quote" required autoFocus placeholder="粘贴值得保留的原文句子……" /></label>
        <label>我的理解<textarea name="thought" placeholder="这段话说了什么？为什么与你的研究有关？" /></label>
        <div className="form-grid">
          <label>关联研究问题<input name="question" placeholder="例如 RQ1" /></label>
          <label>关联论文章节<input name="chapter" placeholder="例如 2.1 概念界定" /></label>
        </div>
        <footer><span>内容保存在当前电脑的本地工作区</span><button type="button" className="inline-ai-button" onClick={onAiAssist}>AI 辅助填写</button><button type="button" onClick={onClose}>取消</button><button className="dark-button" type="submit">保存记录</button></footer>
      </form>
  );
}
