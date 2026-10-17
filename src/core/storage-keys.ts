// 意図: キーの組み立ては Obsidian に依存させない。E2E（Node 上の Playwright）からも
// 同じ規則でキーを作れるよう、storage.ts とは別モジュールにしている。
export function getStorageKeyPrefix(appId: string): string {
  return `dstr-${appId}-`;
}

export function createStorageKey(appId: string, key: string): string {
  return `${getStorageKeyPrefix(appId)}${key}`;
}
