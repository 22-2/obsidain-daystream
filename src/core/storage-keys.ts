import { LEGACY_DAYSTREAM_IDENTIFIERS } from "src/core/legacy-identifiers";

// 意図: キーの組み立ては Obsidian に依存させない。E2E（Node 上の Playwright）からも
// 同じ規則でキーを作れるよう、storage.ts とは別モジュールにしている。

const PLUGIN_KEY_PREFIX = "dstr-";

/** app.saveLocalStorage / loadLocalStorage に渡すキー。保管庫ごとの区別は Obsidian が行う。 */
export function toPluginStorageKey(key: string): string {
  return `${PLUGIN_KEY_PREFIX}${key}`;
}

/** Obsidian が実際に localStorage へ書き込むキーの接頭辞（`<appId>-` を Obsidian が付ける）。 */
export function getStorageKeyPrefix(appId: string): string {
  return `${appId}-${PLUGIN_KEY_PREFIX}`;
}

export function createStorageKey(appId: string, key: string): string {
  return `${getStorageKeyPrefix(appId)}${key}`;
}

/** localStorage を直接使っていた頃のキー。新しい順に並べる。 */
export function createPreviousStorageKeys(appId: string, key: string): string[] {
  return [`dstr-${appId}-${key}`, `${LEGACY_DAYSTREAM_IDENTIFIERS.storagePrefix}${appId}-${key}`];
}
