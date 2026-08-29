import { NextRequest, NextResponse } from "next/server";

type AiProxyRequest = {
  endpoint?: string;
  model?: string;
  credential?: string;
  messages?: { role: "system" | "user" | "assistant"; content: string }[];
  json?: boolean;
  maxTokens?: number;
};

function chatCompletionsUrl(endpoint: string) {
  const url = new URL(endpoint);
  if (url.protocol !== "https:" || url.hostname !== "generativelanguage.googleapis.com") {
    throw new Error("网页版本目前只允许连接 Google Gemini 官方接口");
  }
  if (!url.pathname.startsWith("/v1beta/openai")) throw new Error("Gemini 服务地址应以 /v1beta/openai/ 结尾");
  url.pathname = "/v1beta/openai/chat/completions";
  url.search = "";
  url.hash = "";
  return url.toString();
}

export async function POST(request: NextRequest) {
  let body: AiProxyRequest;
  try {
    body = await request.json() as AiProxyRequest;
  } catch {
    return NextResponse.json({ error: "请求内容无效" }, { status: 400 });
  }

  if (!body.endpoint || !body.model || !body.credential || !body.messages?.length) {
    return NextResponse.json({ error: "AI 连接信息不完整" }, { status: 400 });
  }
  const messageCharacters = body.messages.reduce((total, message) => total + String(message.content || "").length, 0);
  if (messageCharacters > 170000) return NextResponse.json({ error: "文献内容过长，请缩小分析范围" }, { status: 413 });

  try {
    const response = await fetch(chatCompletionsUrl(body.endpoint), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${body.credential}`,
      },
      signal: AbortSignal.timeout(90000),
      body: JSON.stringify({
        model: body.model,
        messages: body.messages,
        max_tokens: Math.min(Math.max(body.maxTokens ?? 1200, 1), 12000),
        ...(body.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    const result = await response.json().catch(() => null) as {
      choices?: { message?: { content?: string } }[];
      error?: { message?: string };
    } | null;

    if (!response.ok) {
      const detail = result?.error?.message || `Gemini 返回 ${response.status}`;
      return NextResponse.json({ error: detail }, { status: response.status });
    }

    const text = result?.choices?.[0]?.message?.content?.trim();
    if (!text) return NextResponse.json({ error: "Gemini 没有返回内容" }, { status: 502 });
    return NextResponse.json({ text }, { headers: { "Cache-Control": "no-store" } });
  } catch (reason) {
    const message = reason instanceof Error && reason.name === "TimeoutError" ? "Gemini 响应超时，请稍后重试" : reason instanceof Error ? reason.message : "无法连接 Gemini";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
