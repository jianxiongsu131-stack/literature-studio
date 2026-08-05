export type CloudDeploymentMode = "local-only" | "managed-cloud" | "self-hosted";
export type AuthProvider = "none" | "email" | "oauth" | "custom-oidc";
export type DatabaseProvider = "none" | "postgres" | "supabase" | "custom-rest";
export type ObjectStorageProvider = "none" | "s3-compatible" | "cloudflare-r2" | "webdav";

export type CloudServicesSettings = {
  mode: CloudDeploymentMode;
  server: {
    apiBaseUrl: string;
    websocketUrl: string;
  };
  auth: {
    provider: AuthProvider;
    endpoint: string;
    clientId: string;
  };
  database: {
    provider: DatabaseProvider;
    endpoint: string;
  };
  storage: {
    provider: ObjectStorageProvider;
    endpoint: string;
    bucket: string;
  };
  sync: {
    enabled: boolean;
    intervalMinutes: number;
  };
  updates: {
    endpoint: string;
    channel: "stable" | "beta";
  };
};

export const defaultCloudServicesSettings: CloudServicesSettings = {
  mode: "local-only",
  server: { apiBaseUrl: "", websocketUrl: "" },
  auth: { provider: "none", endpoint: "", clientId: "" },
  database: { provider: "none", endpoint: "" },
  storage: { provider: "none", endpoint: "", bucket: "" },
  sync: { enabled: false, intervalMinutes: 15 },
  updates: { endpoint: "", channel: "stable" },
};

export function cloudModeName(mode: CloudDeploymentMode) {
  if (mode === "managed-cloud") return "托管云端";
  if (mode === "self-hosted") return "自建服务器";
  return "仅本地";
}

export function cloudServicesConfigured(settings: CloudServicesSettings) {
  return settings.mode !== "local-only" && Boolean(settings.server.apiBaseUrl.trim());
}

// 桌面应用与具体云厂商之间的稳定边界。未来接入服务时实现这些端口，界面无需重写。
export interface AuthServicePort {
  signIn(): Promise<{ userId: string; email?: string }>;
  signOut(): Promise<void>;
  getAccessToken(): Promise<string | null>;
}

export interface SyncServicePort {
  pushChanges(payload: unknown): Promise<{ revision: string }>;
  pullChanges(sinceRevision?: string): Promise<{ revision: string; payload: unknown }>;
}

export interface ObjectStoragePort {
  upload(key: string, data: Blob): Promise<{ key: string; etag?: string }>;
  download(key: string): Promise<Blob>;
  remove(key: string): Promise<void>;
}

export interface ServerHealthPort {
  check(): Promise<{ ok: boolean; version?: string; latencyMs?: number }>;
}

export interface DesktopUpdatePort {
  checkForUpdate(): Promise<{ available: boolean; version?: string; downloadUrl?: string }>;
}
