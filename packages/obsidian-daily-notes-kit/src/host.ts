import type { Vault } from "obsidian";

/**
 * パッケージが Obsidian に求める最小限の窓口。
 * plugins / internalPlugins は非公開 API なので、触り方は利用側に委ねる。
 */
export interface DailyNotesHost {
  getVault(): Vault;
  getCommunityPlugin<T = unknown>(id: string): T | undefined;
  getInternalPluginById<T = unknown>(id: string): T | undefined;
}

export interface NoteNameOptions {
  /** 日付部分の前に付く固定の文字列（例: "novel-"）。 */
  prefix?: string;
}
