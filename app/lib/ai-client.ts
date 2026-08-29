import { AiConnectionSettings } from "./ai-settings";
import { AnalysisResult, literatureAnalysisInstruction, parseAnalysisResult } from "./analysis";

type AiMessage = { role: "system" | "user" | "assistant"; content: string };

async function requestAi(settings: AiConnectionSettings, credential: string, messages: AiMessage[], options?: { json?: boolean; maxTokens?: number }) {
  const response = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: settings.endpoint,
      model: settings.model,
      credential,
      messages,
      json: options?.json,
      maxTokens: options?.maxTokens,
    }),
  });
  const result = await response.json().catch(() => null) as { text?: string; error?: string } | null;
  if (!response.ok) throw new Error(result?.error || "AI 请求失败");
  if (!result?.text) throw new Error("AI 没有返回内容");
  return result.text;
}

export async function verifyAiConnection(settings: AiConnectionSettings, credential: string) {
  const text = await requestAi(settings, credential, [{ role: "user", content: "只回复：连接成功" }], { maxTokens: 20 });
  return text;
}

export async function translateWithAi(settings: AiConnectionSettings, credential: string, source: string, target: string) {
  const limitedSource = source.slice(0, 20000);
  return requestAi(settings, credential, [
    { role: "system", content: "你是严谨的学术翻译助手。忠实保留术语、限定条件、引文标记与段落结构；只输出译文，不添加解释。" },
    { role: "user", content: `请将以下学术文本翻译为${target}：\n\n${limitedSource}` },
  ], { maxTokens: 4000 });
}

export async function analyzeLiteratureWithAi(settings: AiConnectionSettings, credential: string, title: string, sourceText: string): Promise<AnalysisResult> {
  const text = await requestAi(settings, credential, [
    { role: "system", content: literatureAnalysisInstruction },
    { role: "user", content: `论文标题：${title}\n\n以下正文以“[第 N 页]”标记页码：\n\n${sourceText}` },
  ], { json: true, maxTokens: 8000 });
  return parseAnalysisResult(text);
}
