"use client";

import { FormEvent, useState } from "react";
import { AiConnectionSettings, aiConnectionName } from "../lib/ai-settings";
import { CloudServicesSettings } from "../lib/cloud-services";
import CloudServicesSettingsPanel from "./CloudServicesSettings";

type MapAppearance = {
  background: "plain" | "warm" | "dark";
  line: "coffee" | "ginger" | "sage";
};

export default function SettingsCenter({ appearance, aiSettings, cloudSettings, hasSessionCredential, aiVerified, onAppearanceChange, onSaveAi, onTestAi, onSaveCloud, onNotify }: {
  appearance: MapAppearance;
  aiSettings: AiConnectionSettings;
  cloudSettings: CloudServicesSettings;
  hasSessionCredential: boolean;
  aiVerified: boolean;
  onAppearanceChange: (appearance: MapAppearance) => void;
  onSaveAi: (settings: AiConnectionSettings, credential: string) => void;
  onTestAi: (settings: AiConnectionSettings, credential: string) => Promise<void>;
  onSaveCloud: (settings: CloudServicesSettings) => void;
  onNotify: (message: string) => void;
}) {
  const [testing, setTesting] = useState(false);
  const [testMessage, setTestMessage] = useState("");

  function readAiForm(form: HTMLFormElement) {
    const data = new FormData(form);
    return {
      settings: {
        mode: data.get("mode") as AiConnectionSettings["mode"],
        provider: data.get("provider") as AiConnectionSettings["provider"],
        endpoint: String(data.get("endpoint") || "").trim(),
        model: String(data.get("model") || "").trim(),
      },
      credential: String(data.get("credential") || "").trim(),
    };
  }

  function saveAi(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { settings, credential } = readAiForm(event.currentTarget);
    onSaveAi(settings, credential);
    setTestMessage("");
  }

  async function testAi(form: HTMLFormElement) {
    const { settings, credential } = readAiForm(form);
    if (settings.mode !== "cloud") {
      setTestMessage("网页版本请先选择云端 API");
      return;
    }
    setTesting(true);
    setTestMessage("");
    try {
      await onTestAi(settings, credential);
      setTestMessage("连接成功，设置已保存");
    } catch (reason) {
      setTestMessage(reason instanceof Error ? reason.message : "连接失败，请检查设置");
    } finally {
      setTesting(false);
    }
  }

  return <div className="settings-center">
    <header className="settings-header"><span className="eyebrow">LOCAL APP SETTINGS</span><h1>设置</h1><p>集中管理图谱外观、AI 连接和本地应用准备项。</p></header>

    <section className="settings-section">
      <div className="settings-section-title"><div><span>01</span><h2>图谱外观</h2><p>这里的设置会应用到所有论文项目。</p></div><small>本机自动保存</small></div>
      <div className="settings-row"><span>背景</span><div className="settings-options">
        {([["plain", "纯白"], ["warm", "奶杏"], ["dark", "深咖"]] as const).map(([value, label]) => <button key={value} className={appearance.background === value ? "active" : ""} onClick={() => onAppearanceChange({ ...appearance, background: value })}><i className={`background-swatch ${value}`} />{label}</button>)}
      </div></div>
      <div className="settings-row"><span>连接线</span><div className="settings-options">
        {([["coffee", "深咖"], ["ginger", "姜黄"], ["sage", "墨绿"]] as const).map(([value, label]) => <button key={value} className={appearance.line === value ? "active" : ""} onClick={() => onAppearanceChange({ ...appearance, line: value })}><i className={`line-swatch ${value}`} />{label}</button>)}
      </div></div>
    </section>

    <section className="settings-section ai-connection-settings">
      <div className="settings-section-title"><div><span>02</span><h2>AI 连接</h2><p>可接入兼容 API，也可连接本机运行的模型服务。</p></div><small className={aiVerified ? "ready" : "waiting"}>{aiVerified ? `${aiConnectionName(aiSettings)} · 已验证` : aiSettings.mode === "unconfigured" ? "尚未连接 AI" : `${aiConnectionName(aiSettings)} · 待测试`}</small></div>
      <form onSubmit={saveAi}>
        <div className="connection-mode">
          {(["unconfigured", "cloud", "local"] as const).map((mode) => <label key={mode}><input type="radio" name="mode" value={mode} defaultChecked={aiSettings.mode === mode} /><span>{mode === "cloud" ? "云端 API" : mode === "local" ? "本地模型" : "暂不连接"}</span></label>)}
        </div>
        <div className="settings-form-grid">
          <label>接口类型<select name="provider" defaultValue={aiSettings.provider}><option value="openai-compatible">OpenAI 兼容接口</option><option value="custom">自定义接口</option></select></label>
          <label>模型名称<input name="model" defaultValue={aiSettings.model} placeholder="例如模型名称或本地模型标识" /></label>
        </div>
        <label>服务地址<input name="endpoint" defaultValue={aiSettings.endpoint} placeholder="https://…/v1 或 http://127.0.0.1:11434/v1" /></label>
        <label>API 密钥（云端连接）<input name="credential" type="password" autoComplete="off" placeholder={hasSessionCredential ? "本次运行已提供；留空则继续使用" : "当前原型仅在本次运行中使用"} /></label>
        <div className="credential-note"><i>锁</i><p>密钥只保留在当前页面会话中，不写入项目数据或 GitHub；刷新网页后需要重新填写。</p></div>
        {testMessage && <div className={`connection-test-message ${testMessage.startsWith("连接成功") ? "success" : "error"}`}>{testMessage}</div>}
        <footer><button type="button" onClick={() => onNotify("测试成功后，摘要与翻译才会使用真实 Gemini")}>连接说明</button><button className="test-ai-button" type="button" disabled={testing} onClick={(event) => void testAi(event.currentTarget.form!)}>{testing ? "正在测试…" : "测试连接"}</button><button className="dark-button" type="submit">保存 AI 连接</button></footer>
      </form>
    </section>

    <CloudServicesSettingsPanel settings={cloudSettings} onSave={onSaveCloud} onNotify={onNotify} />

    <section className="settings-section desktop-readiness">
      <div className="settings-section-title"><div><span>04</span><h2>本地应用</h2><p>当前数据与 PDF 均保留在本机，等待第三阶段接入真实文件系统。</p></div><small className="ready">桌面化准备中</small></div>
      <div className="readiness-list"><span><i>✓</i>工作区存储已独立</span><span><i>✓</i>PDF 存储已独立</span><span><i>✓</i>AI 与云服务端口已统一</span></div>
    </section>
  </div>;
}
