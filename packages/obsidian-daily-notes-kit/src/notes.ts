import type { Moment } from "moment";
import { normalizePath, TFile, TFolder, Vault } from "obsidian";
import type { Granularity } from "./granularity";
import type { NoteNameOptions, DailyNotesHost } from "./host";
import { getNoteSettings } from "./settings";
import { getDateFromFile, getDateUID } from "./utils";

/**
 * 日付と granularity から、ノートのフルパスを生成する。
 * prefix="" → "folder/2026-03-04.md"
 * prefix="novel-" → "folder/novel-2026-03-04.md"
 */
export function resolveNotePath(
  host: DailyNotesHost,
  date: Moment,
  granularity: Granularity,
  { prefix = "" }: NoteNameOptions = {},
): string {
  const { format, folder } = getNoteSettings(host, granularity);
  const filename = `${prefix}${date.format(format)}.md`;
  return folder ? normalizePath(`${folder}/${filename}`) : normalizePath(filename);
}

/**
 * 設定フォルダ以下から該当ノートを全件取得し、dateUID -> TFile のマップを返す。
 */
export function getAllNotes(
  host: DailyNotesHost,
  granularity: Granularity,
  options: NoteNameOptions = {},
): Record<string, TFile> {
  const { folder } = getNoteSettings(host, granularity);
  const vault = host.getVault();

  const folderPath = folder ? normalizePath(folder) : "/";
  const folderFile = vault.getAbstractFileByPath(folderPath);
  const folderToSearch = folderFile instanceof TFolder ? folderFile : vault.getRoot();

  const result: Record<string, TFile> = {};

  Vault.recurseChildren(folderToSearch, (node) => {
    if (!(node instanceof TFile)) return;
    if (node.extension !== "md") return;

    const date = getDateFromFile(host, node, granularity, options);
    if (!date) return;

    result[getDateUID(date, granularity)] = node;
  });

  return result;
}

/**
 * 特定の日付のノートを返す。存在しなければ null。
 */
export function getNote(
  host: DailyNotesHost,
  date: Moment,
  granularity: Granularity,
  options: NoteNameOptions = {},
): TFile | null {
  const notes = getAllNotes(host, granularity, options);
  return notes[getDateUID(date, granularity)] ?? null;
}

/**
 * ノートを新規作成する（テンプレートなしのシンプル版）。
 * フォルダが存在しない場合は自動作成する。
 */
export async function createNote(
  host: DailyNotesHost,
  date: Moment,
  granularity: Granularity,
  options: NoteNameOptions = {},
): Promise<TFile> {
  const path = resolveNotePath(host, date, granularity, options);
  const vault = host.getVault();

  const dir = path.substring(0, path.lastIndexOf("/"));
  if (dir && !vault.getAbstractFileByPath(dir)) {
    await vault.createFolder(dir);
  }

  return vault.create(path, "");
}
