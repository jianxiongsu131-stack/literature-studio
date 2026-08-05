type DesktopStorageBridge = {
  read: (key: string) => Promise<string | null>;
  write: (key: string, value: string) => Promise<void>;
};

declare global {
  interface Window {
    yanjiDesktop?: {
      storage: DesktopStorageBridge;
    };
  }
}

export async function loadWorkspaceValue<T>(key: string, fallback: T): Promise<T> {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.yanjiDesktop
      ? await window.yanjiDesktop.storage.read(key)
      : window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function saveWorkspaceValue<T>(key: string, value: T): Promise<void> {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(value);
  if (window.yanjiDesktop) {
    await window.yanjiDesktop.storage.write(key, serialized);
  } else {
    window.localStorage.setItem(key, serialized);
  }
}
