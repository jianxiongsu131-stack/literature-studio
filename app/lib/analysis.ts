export type AnalysisSection = {
  id: string;
  type: "introduction" | "theory" | "experiment" | "results" | "discussion" | "conclusion" | "other";
  label: string;
  summary: string;
  learnablePoints: string[];
  pages: string[];
  confidence: "high" | "medium" | "low";
};

export type AnalysisResult = {
  purpose: string;
  sections: AnalysisSection[];
  generatedAt: string;
  source: "mock" | "api";
};

export const literatureAnalysisInstruction = `
你是严谨的学术文献分析助手。请根据提供的论文正文完成以下任务：
1. 依据标题和正文结构识别并归一化为：引言、理论、实验、结果、讨论、结论；不要仅凭关键词截断。
2. 对每个实际存在的部分分别回答“该部分说了什么”和“有什么好的地方值得借鉴”。
3. 所有结论必须能在原文中找到依据，并返回对应页码和置信度。
4. 原文缺失的部分不要补写；无法判断时标记为 other 或低置信度。
5. 只返回符合 AnalysisResult 结构的 JSON，不输出额外说明。
`;

const baseSections: AnalysisSection[] = [
  { id: "introduction", type: "introduction", label: "引言", summary: "作者从生成式 AI 进入学术阅读的现实变化出发，指出现有研究更多关注效率，却较少解释 AI 是否改变了读者的认知投入与论证核对过程。由此提出研究问题：AI 辅助阅读如何影响深度阅读。", learnablePoints: ["用‘已有研究重效率、轻过程’构造清晰的研究缺口。", "在引言末尾把抽象问题转化为可观察的阅读行为。"], pages: ["p. 1–3"], confidence: "high" },
  { id: "theory", type: "theory", label: "理论", summary: "文章把深度阅读界定为文本理解、既有知识激活、论证核对与反思判断共同构成的过程，并用认知投入框架解释不同辅助方式可能产生的影响。", learnablePoints: ["概念定义同时写明构成维度，便于后续操作化。", "把工具功能与认知过程逐项对应，理论链条比较完整。"], pages: ["p. 4–7"], confidence: "high" },
  { id: "experiment", type: "experiment", label: "实验", summary: "研究将参与者分为自由使用 AI、使用结构化反思提示和不使用 AI 三组，完成同一篇学术文本的阅读任务，并结合屏幕行为、阅读理解测验与访谈收集数据。", learnablePoints: ["同时使用行为、结果和访谈数据，避免单一指标解释。", "实验条件围绕具体设计机制展开，便于比较提示方式。"], pages: ["p. 8–12"], confidence: "medium" },
  { id: "results", type: "results", label: "结果", summary: "结构化提示组更频繁地回看原文并核对论证关系；自由使用 AI 组完成速度更快，但在反驳作者观点与迁移判断上的优势不明显。", learnablePoints: ["区分效率提升与理解质量，避免把速度直接视为效果。", "结果按照研究问题组织，阅读时容易追踪证据。"], pages: ["p. 13–18"], confidence: "high" },
  { id: "discussion", type: "discussion", label: "讨论", summary: "作者认为 AI 不必然削弱或促进深度阅读，关键在于交互是否要求读者返回原文、解释判断并保留不确定性；同时讨论了过度依赖自动摘要的风险。", learnablePoints: ["讨论没有停留在组间差异，而是进一步解释可能机制。", "主动呈现与结论相反的风险，使设计建议更可信。"], pages: ["p. 19–22"], confidence: "high" },
  { id: "conclusion", type: "conclusion", label: "结论", summary: "文章总结，面向深度阅读的 AI 工具应把摘要视为定位入口，而不是原文替代，并通过结构化记录帮助读者保留证据、页码与自己的解释。", learnablePoints: ["设计原则由实验结果直接推导，结论和证据对应明确。", "清楚限定研究只覆盖短时阅读任务，为后续研究留下空间。"], pages: ["p. 23–24"], confidence: "medium" },
];

const purposes: Record<string, string> = {
  "liu-2024": "这篇文章研究 AI 辅助工具会怎样改变学术阅读中的认知投入，并比较自由使用 AI、结构化反思提示与无 AI 阅读三种情境。核心价值是把‘深度阅读’从抽象概念转化为可观察的阅读行为。",
  "park-2023": "这篇文章分析数字阅读环境中的认知投入，重点讨论注意维持、论证核对和既有知识激活之间的关系，为界定深度阅读提供测量框架。",
  "sun-2022": "这是一篇理论性文章，重新梳理深度阅读的定义与边界，并解释它与信息获取、沉浸阅读和批判性阅读之间的区别。",
  "wang-2025": "这篇文章比较不同提示问题对批判性阅读的影响，关注结构化提示是否能促使读者检查证据、提出反例并形成自己的判断。",
  "miller-2022": "这篇方法论文介绍如何结合思维出声与回溯访谈研究阅读过程，并讨论这种方法对研究者干预、数据编码和结果解释的影响。",
  "zhang-2023": "这篇文章考察数字化记录方式是否支持长期知识保持，比较单篇笔记、主题化组织和跨文献连接在延迟任务中的表现。",
};

export function createMockAnalysis(literatureId: string, generatedAt = "2026-08-05T14:30:00+08:00"): AnalysisResult {
  return {
    purpose: purposes[literatureId] ?? "这篇文献尚未接入真实 PDF。当前摘要用于演示文献结构分类与记录流程；接入模型接口后，将只根据原文生成内容并保留页码证据。",
    sections: baseSections,
    generatedAt,
    source: "mock",
  };
}
