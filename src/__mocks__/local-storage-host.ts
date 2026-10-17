import type { LocalStorageHost } from "src/core/storage";

/**
 * app.saveLocalStorage / loadLocalStorage と同じ規則で jsdom の localStorage を使う代替。
 * 実機（Obsidian 1.13）と同じく、falsy な値の保存はキーの削除として扱う。
 */
export function createLocalStorageHost(appId: string): LocalStorageHost {
  const toKey = (key: string) => `${appId}-${key}`;
  return {
    appId,
    loadLocalStorage: (key) => {
      const raw = window.localStorage.getItem(toKey(key));
      if (raw === null) return null;
      try {
        const parsed: unknown = JSON.parse(raw);
        return parsed;
      } catch {
        return null;
      }
    },
    saveLocalStorage: (key, data) => {
      if (!data) {
        window.localStorage.removeItem(toKey(key));
        return;
      }
      window.localStorage.setItem(toKey(key), JSON.stringify(data));
    },
  };
}
