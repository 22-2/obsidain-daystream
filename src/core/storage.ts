import { reportError } from "src/core/error-report";
import { LEGACY_DAYSTREAM_IDENTIFIERS } from "src/core/legacy-identifiers";
import { createStorageKey } from "src/core/storage-keys";

export class DSTRStorage {
  private appId: string;

  constructor(appId: string) {
    this.appId = appId;
  }

  private getKey(key: string): string {
    return createStorageKey(this.appId, key);
  }

  private getLegacyKey(key: string): string {
    return `${LEGACY_DAYSTREAM_IDENTIFIERS.storagePrefix}${this.appId}-${key}`;
  }

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(this.getKey(key), JSON.stringify(value));
      localStorage.removeItem(this.getLegacyKey(key));
    } catch (e) {
      reportError({ context: "Failed to save to localStorage", error: e, details: { key } });
    }
  }

  get<T>(key: string, defaultValue: T): T {
    try {
      const currentKey = this.getKey(key);
      const currentValue = localStorage.getItem(currentKey);
      if (currentValue !== null) return JSON.parse(currentValue) as T;

      const legacyKey = this.getLegacyKey(key);
      const legacyValue = localStorage.getItem(legacyKey);
      if (legacyValue === null) return defaultValue;

      localStorage.setItem(currentKey, legacyValue);
      localStorage.removeItem(legacyKey);
      return JSON.parse(legacyValue) as T;
    } catch (e) {
      reportError({
        context: "Failed to parse localStorage value, using default",
        error: e,
        details: { key },
      });
      return defaultValue;
    }
  }

  remove(key: string): void {
    localStorage.removeItem(this.getKey(key));
    localStorage.removeItem(this.getLegacyKey(key));
  }
}
