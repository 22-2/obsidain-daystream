import type { App } from "obsidian";
import { reportError } from "src/core/error-report";
import { createPreviousStorageKeys, toPluginStorageKey } from "src/core/storage-keys";

/** DSTRStorage が使う App の機能。テストでは同じ振る舞いの代替を渡す。 */
export type LocalStorageHost = Pick<App, "loadLocalStorage" | "saveLocalStorage"> & {
  appId: string;
};

// 意図: Obsidian の saveLocalStorage は（ドキュメントの「null なら削除」と異なり）
// false・""・0 などの falsy な値でもキーを削除する。値を常に truthy な
// オブジェクトで包み、「パネルを閉じた（false）」などの状態を失わないようにする。
type StoredValue = { value: unknown };

function isStoredValue(raw: unknown): raw is StoredValue {
  return typeof raw === "object" && raw !== null && "value" in raw;
}

/**
 * 保管庫ごとの UI 状態を app.saveLocalStorage / loadLocalStorage で保存する。
 *
 * キーの保管庫分離と JSON 変換は Obsidian に任せる。null を保存するとキーを消すため、
 * null と「未保存」は区別されず、get は既定値を返す。
 */
export class DSTRStorage {
  constructor(private readonly app: LocalStorageHost) {}

  set<T>(key: string, value: T): void {
    try {
      const stored: StoredValue | null = value === null ? null : { value };
      this.app.saveLocalStorage(toPluginStorageKey(key), stored);
      this.removePreviousValues(key);
    } catch (error) {
      reportError({ context: "Failed to save to localStorage", error, details: { key } });
    }
  }

  get<T>(key: string, defaultValue: T): T {
    const raw: unknown = this.app.loadLocalStorage(toPluginStorageKey(key));
    if (isStoredValue(raw)) return raw.value as T;
    return this.migratePreviousValue(key) ?? defaultValue;
  }

  remove(key: string): void {
    this.app.saveLocalStorage(toPluginStorageKey(key), null);
    this.removePreviousValues(key);
  }

  // --- 移行 ---
  // 意図: 以前のリリースは localStorage を直接使っており、その値は
  // loadLocalStorage では読めない。移行のためだけに localStorage を直接触る。

  private migratePreviousValue<T>(key: string): T | null {
    for (const previousKey of createPreviousStorageKeys(this.app.appId, key)) {
      const raw = window.localStorage.getItem(previousKey);
      if (raw === null) continue;

      try {
        const value = JSON.parse(raw) as T;
        this.set(key, value);
        return value;
      } catch (error) {
        reportError({
          context: "Failed to migrate localStorage value, using default",
          error,
          details: { key: previousKey },
        });
        window.localStorage.removeItem(previousKey);
      }
    }
    return null;
  }

  private removePreviousValues(key: string): void {
    for (const previousKey of createPreviousStorageKeys(this.app.appId, key)) {
      window.localStorage.removeItem(previousKey);
    }
  }
}
