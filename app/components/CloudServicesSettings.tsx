"use client";

import { FormEvent } from "react";
import { CloudServicesSettings, cloudModeName, cloudServicesConfigured } from "../lib/cloud-services";

export default function CloudServicesSettings({ settings, onSave, onNotify }: {
  settings: CloudServicesSettings;
  onSave: (settings: CloudServicesSettings) => void;
  onNotify: (message: string) => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSave({
      mode: data.get("cloudMode") as CloudServicesSettings["mode"],
      server: {
        apiBaseUrl: String(data.get("apiBaseUrl") || "").trim(),
        websocketUrl: String(data.get("websocketUrl") || "").trim(),
      },
      auth: {
        provider: data.get("authProvider") as CloudServicesSettings["auth"]["provider"],
        endpoint: String(data.get("authEndpoint") || "").trim(),
        clientId: String(data.get("authClientId") || "").trim(),
      },
      database: {
        provider: data.get("databaseProvider") as CloudServicesSettings["database"]["provider"],
        endpoint: String(data.get("databaseEndpoint") || "").trim(),
      },
      storage: {
        provider: data.get("storageProvider") as CloudServicesSettings["storage"]["provider"],
        endpoint: String(data.get("storageEndpoint") || "").trim(),
        bucket: String(data.get("storageBucket") || "").trim(),
      },
      sync: {
        enabled: data.get("syncEnabled") === "on",
        intervalMinutes: Math.max(5, Number(data.get("syncInterval")) || 15),
      },
      updates: {
        endpoint: String(data.get("updateEndpoint") || "").trim(),
        channel: data.get("updateChannel") as CloudServicesSettings["updates"]["channel"],
      },
    });
  }

  return <section className="settings-section cloud-services-settings">
    <div className="settings-section-title"><div><span>03</span><h2>云端与服务器</h2><p>为托管云端或自建服务器保留统一窗口；未启用时全部功能继续使用本地数据。</p></div><small className={cloudServicesConfigured(settings) ? "ready" : "waiting"}>{cloudModeName(settings.mode)}</small></div>
    <form onSubmit={submit}>
      <div className="cloud-mode-options">
        {([
          ["local-only", "仅本地", "不连接任何服务器"],
          ["managed-cloud", "托管云端", "未来官方同步服务"],
          ["self-hosted", "自建服务器", "连接你自己的服务"],
        ] as const).map(([value, title, description]) => <label key={value}><input type="radio" name="cloudMode" value={value} defaultChecked={settings.mode === value} /><span><i>{value === "local-only" ? "本" : value === "managed-cloud" ? "云" : "服"}</i><strong>{title}</strong><small>{description}</small></span></label>)}
      </div>

      <div className="cloud-service-grid">
        <fieldset><legend><i>01</i><span><strong>应用服务器</strong><small>同步、账户与业务 API 的统一入口</small></span></legend><label>API 基础地址<input name="apiBaseUrl" defaultValue={settings.server.apiBaseUrl} placeholder="https://api.example.com/v1" /></label><label>实时同步地址<input name="websocketUrl" defaultValue={settings.server.websocketUrl} placeholder="wss://api.example.com/sync" /></label></fieldset>
        <fieldset><legend><i>02</i><span><strong>账户认证</strong><small>邮箱、OAuth 或自定义 OIDC</small></span></legend><label>认证方式<select name="authProvider" defaultValue={settings.auth.provider}><option value="none">暂不连接</option><option value="email">邮箱登录</option><option value="oauth">OAuth</option><option value="custom-oidc">自定义 OIDC</option></select></label><label>认证服务地址<input name="authEndpoint" defaultValue={settings.auth.endpoint} placeholder="https://auth.example.com" /></label><label>客户端 ID<input name="authClientId" defaultValue={settings.auth.clientId} placeholder="桌面应用 Client ID" /></label></fieldset>
        <fieldset><legend><i>03</i><span><strong>云数据库</strong><small>保存结构化项目与研究记录</small></span></legend><label>数据库适配器<select name="databaseProvider" defaultValue={settings.database.provider}><option value="none">暂不连接</option><option value="postgres">PostgreSQL</option><option value="supabase">Supabase</option><option value="custom-rest">自定义 REST 服务</option></select></label><label>数据库网关地址<input name="databaseEndpoint" defaultValue={settings.database.endpoint} placeholder="通过服务器访问，不在客户端保存密码" /></label></fieldset>
        <fieldset><legend><i>04</i><span><strong>文件与 PDF 存储</strong><small>可选上传；默认仍保存在电脑</small></span></legend><label>对象存储<select name="storageProvider" defaultValue={settings.storage.provider}><option value="none">暂不连接</option><option value="s3-compatible">S3 兼容存储</option><option value="cloudflare-r2">Cloudflare R2</option><option value="webdav">WebDAV</option></select></label><label>存储服务地址<input name="storageEndpoint" defaultValue={settings.storage.endpoint} placeholder="https://storage.example.com" /></label><label>存储空间 / Bucket<input name="storageBucket" defaultValue={settings.storage.bucket} placeholder="yanji-documents" /></label></fieldset>
        <fieldset><legend><i>05</i><span><strong>同步策略</strong><small>离线优先，联网后增量同步</small></span></legend><label className="cloud-checkbox"><input type="checkbox" name="syncEnabled" defaultChecked={settings.sync.enabled} /><span>启用云端同步</span></label><label>自动同步间隔<select name="syncInterval" defaultValue={settings.sync.intervalMinutes}><option value="5">5 分钟</option><option value="15">15 分钟</option><option value="30">30 分钟</option><option value="60">60 分钟</option></select></label></fieldset>
        <fieldset><legend><i>06</i><span><strong>桌面应用更新</strong><small>为版本检查和安装包下载预留</small></span></legend><label>更新服务地址<input name="updateEndpoint" defaultValue={settings.updates.endpoint} placeholder="https://updates.example.com" /></label><label>更新通道<select name="updateChannel" defaultValue={settings.updates.channel}><option value="stable">稳定版</option><option value="beta">测试版</option></select></label></fieldset>
      </div>

      <div className="cloud-security-note"><i>锁</i><p><strong>这里只保存非敏感连接参数。</strong>数据库密码、存储密钥、登录令牌和服务器密钥不会写入项目；桌面版将统一存入 macOS 钥匙串，并由本地安全层调用。</p></div>
      <footer><button type="button" onClick={() => onNotify("服务连通测试将在对应后端启用后开放")}>测试所有连接</button><button className="dark-button" type="submit">保存云端与服务器设置</button></footer>
    </form>
  </section>;
}
