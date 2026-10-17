import { LEGACY_DAYSTREAM_IDENTIFIERS } from "src/core/legacy-identifiers";

export function getStorageKeyPrefix(appId: string): string {
  return `dstr-${appId}-`;
}

export function createStorageKey(appId: string, key: string): string {
  return `${getStorageKeyPrefix(appId)}${key}`;
}

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
      console.error("Failed to save to localStorage", e);
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
      console.warn(`Failed to parse localStorage value for ${key}, using default`, e);
      return defaultValue;
    }
  }

  remove(key: string): void {
    localStorage.removeItem(this.getKey(key));
    localStorage.removeItem(this.getLegacyKey(key));
  }
}
