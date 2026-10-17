import type { Remote } from "comlink";
import { TFile, type FileManager } from "obsidian";
import type { IDBService } from "src/core/db/interfaces/IDBService";
import { DEFAULT_SETTINGS, type Settings } from "src/core/domain/settings";
import type { ObsidianAppShell } from "src/core/platform/obsidian-shell";

// テスト用の TFile。本物の TFile と同じく path / basename / extension を持つ。
export function createFakeTFile(path: string, basename?: string): TFile {
  const name = path.slice(path.lastIndexOf("/") + 1).replace(/\.md$/, "");
  return Object.assign(new TFile(), { path, basename: basename ?? name, extension: "md" });
}

// テストで使う公開メンバーだけを差し替えた擬似オブジェクト。
// 実体のクラスは内部状態を持つため、部分的な定義を本体の型へ合わせる境界はこのファイルに集約する。
export function createFakeShell(members: Partial<ObsidianAppShell>): ObsidianAppShell {
  return members as ObsidianAppShell;
}

export function createFakeFileManager(members: Partial<FileManager>): FileManager {
  return members as FileManager;
}

export function createFakeDBService(members: Partial<IDBService>): Remote<IDBService> {
  return members as Remote<IDBService>;
}

export function createFakeSettings(overrides: Partial<Settings> = {}): Settings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}
