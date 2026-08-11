import { normalizePath, TFile, TFolder, Vault } from "obsidian";
import { getPeriodicSettings } from "src/lib/daily-notes/settings";
import { getDateFromFile, getDateUID } from "src/lib/daily-notes/utils";
import type { ObsidianAppShell } from "src/shell/obsidian-shell";
import type { Granularity, MomentLike } from "src/ui/types";

/**
 * トピックIDとgranularityから、ノートのフルパスを生成する。
 * topicId="" → "folder/2026-03-04.md"
 * topicId="novel" → "folder/novel-2026-03-04.md"
 */
export function resolveTopicNotePath(
  date: MomentLike,
  g: Granularity,
  topicId: string,
  shell: ObsidianAppShell,
): string {
  const { format, folder } = getPeriodicSettings(g, shell);
  const dateStr = date.format(format);
  const prefix = topicId ? `${topicId}-` : "";
  const filename = `${prefix}${dateStr}.md`;
  return folder ? normalizePath(`${folder}/${filename}`) : normalizePath(filename);
}

/**
 * Vault内からトピック付きノートを全件取得し、dateUID -> TFile のマップを返す。
 * topicId="" の場合はプレフィックスなし（デフォルトのデイリーノートと同じ）。
 */
export function getAllTopicNotes(
  shell: ObsidianAppShell,
  g: Granularity,
  topicId: string = "",
): Record<string, TFile> {
  const { folder } = getPeriodicSettings(g, shell);
  const vault = shell.getVault();

  const folderPath = folder ? normalizePath(folder) : "/";
  const folderFile = vault.getAbstractFileByPath(folderPath);
  const folderToSearch = folderFile instanceof TFolder ? folderFile : vault.getRoot();

  const result: Record<string, TFile> = {};

  Vault.recurseChildren(folderToSearch, (node) => {
    if (!(node instanceof TFile)) return;
    if (node.extension !== "md") return;

    const date = getDateFromFile(node, g, shell, topicId);
    if (!date) return;

    const uid = getDateUID(date, g);
    result[uid] = node;
  });

  return result;
}

/**
 * 特定の日付のトピック付きノートを返す。存在しなければ null。
 */
export function getTopicNote(
  shell: ObsidianAppShell,
  date: MomentLike,
  g: Granularity,
  topicId: string,
): TFile | null {
  const notes = getAllTopicNotes(shell, g, topicId);
  const uid = getDateUID(date, g);
  return notes[uid] ?? null;
}

/**
 * トピック付きノートを新規作成する（テンプレートなしのシンプル版）。
 * フォルダが存在しない場合は自動作成する。
 */
export async function createTopicNote(
  shell: ObsidianAppShell,
  date: MomentLike,
  g: Granularity,
  topicId: string,
): Promise<TFile> {
  const path = resolveTopicNotePath(date, g, topicId, shell);
  const vault = shell.getVault();

  // フォルダ作成
  const dir = path.substring(0, path.lastIndexOf("/"));
  if (dir && !vault.getAbstractFileByPath(dir)) {
    await vault.createFolder(dir);
  }

  const file = await vault.create(path, "");
  return file;
}
