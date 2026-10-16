export function getStorageKeyPrefix(appId: string): string {
  return `mfdi-${appId}-`;
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

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(this.getKey(key), JSON.stringify(value));
    } catch (e) {
      console.error("Failed to save to localStorage", e);
    }
  }

  get<T>(key: string, defaultValue: T): T {
    try {
      const value = localStorage.getItem(this.getKey(key));
      if (value === null) return defaultValue;
      return JSON.parse(value) as T;
    } catch (e) {
      console.warn(`Failed to parse localStorage value for ${key}, using default`, e);
      return defaultValue;
    }
  }

  remove(key: string): void {
    localStorage.removeItem(this.getKey(key));
  }
}
