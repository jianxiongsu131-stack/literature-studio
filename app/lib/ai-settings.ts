export type AiConnectionMode = "unconfigured" | "cloud" | "local";

export type AiConnectionSettings = {
  mode: AiConnectionMode;
  provider: "openai-compatible" | "custom";
  endpoint: string;
  model: string;
};

export const defaultAiConnectionSettings: AiConnectionSettings = {
  mode: "unconfigured",
  provider: "openai-compatible",
  endpoint: "https://api.openai.com/v1",
  model: "",
};

export function aiConnectionName(settings: AiConnectionSettings) {
  if (settings.mode === "local") return settings.model ? `本地 · ${settings.model}` : "本地模型未完成";
  if (settings.mode === "cloud") return settings.model ? `云端 · ${settings.model}` : "云端 API 未完成";
  return "尚未连接 AI";
}

export function aiConnectionReady(settings: AiConnectionSettings, hasSessionCredential: boolean) {
  if (!settings.endpoint.trim() || !settings.model.trim()) return false;
  return settings.mode === "local" || (settings.mode === "cloud" && hasSessionCredential);
}
