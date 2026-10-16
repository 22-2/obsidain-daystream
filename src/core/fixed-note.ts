import { normalizePath, TFile } from "obsidian";
import { ensureExtension } from "src/core/path";
import type { ObsidianAppShell } from "src/core/platform/obsidian-shell";

export const FILENAME_SUFFIX = ".mfdi.md";
export const UNTITLED_FILENAME = `Untitled`;

// --- ユーティリティ ---
const norm = (p: string) => normalizePath(p.trim()).replace(/\/$/, "");

export const normalizeFixedNotePath = (p: string) => {
  const s = norm(p);
  return s && !s.toLowerCase().endsWith(".md") ? `${s}.md` : s;
};

export const isDaystreamFixedNotePath = (p: string) =>
  normalizePath(p).toLowerCase().endsWith(FILENAME_SUFFIX);

// --- 取得・作成 ---
export function resolveFixedNote(shell: ObsidianAppShell, raw: string | null): TFile | null {
  const path = normalizeFixedNotePath(raw ?? "");
  const file = path ? shell.getAbstractFileByPath(path) : null;
  // テスト環境では `({ path } as TFile)` のようにプレーンオブジェクトで TFile を模した値が使われるため
  // `instanceof TFile` が false になることがある。実行時の堅牢性を上げるため、まず `instanceof` を試し、
  // それ以外はダックタイピングで `path` を持つオブジェクトを受け入れる。
  if (!file) return null;
  if (file instanceof TFile) return file;
  if ((file as any).path && typeof (file as any).path === "string") return file as TFile;
  return null;
}

export async function renameFixedNote(
  shell: ObsidianAppShell,
  raw: string | null,
  newTitle: string,
): Promise<string | null> {
  const title = newTitle.trim();
  if (!title) return null;

  const file = resolveFixedNote(shell, raw);
  if (!file) return null;

  await shell.getFileManager().renameFile(file, ensureExtension(title, FILENAME_SUFFIX));
  return file.path;
}

export async function trashFixedNote(shell: ObsidianAppShell, raw: string | null): Promise<void> {
  const file = resolveFixedNote(shell, raw);
  if (!file) return;

  await shell.getFileManager().trashFile(file);
}

async function ensureFolder(shell: ObsidianAppShell, path: string) {
  let current = "";
  for (const seg of path.split("/").filter(Boolean)) {
    current = current ? `${current}/${seg}` : seg;
    if (!shell.getAbstractFileByPath(current)) await shell.createFolder(current);
  }
}

export async function ensureFixedNote(shell: ObsidianAppShell, raw: string): Promise<TFile> {
  const path = normalizeFixedNotePath(raw);
  if (!path) throw new Error("path is empty");

  const existing = resolveFixedNote(shell, path);
  if (existing) return existing;

  const folderPath = path.substring(0, path.lastIndexOf("/"));
  if (folderPath) await ensureFolder(shell, folderPath);

  return shell.createFile(path, "");
}

// --- パス生成 ---
export function buildFixedNotePathFromName(
  folder: string,
  name: string,
  shell: ObsidianAppShell,
): string {
  const prefix = norm(folder) ? `${norm(folder)}/` : "";
  const base = ensureExtension(`${prefix}${name.trim() || UNTITLED_FILENAME}`, FILENAME_SUFFIX);

  let path = base,
    i = 1;
  while (shell.getAbstractFileByPath(path)) {
    path = base.replace(FILENAME_SUFFIX, ` ${i++}${FILENAME_SUFFIX}`);
  }
  return path;
}

export const createNewFixedNote = (shell: ObsidianAppShell, folder: string) =>
  ensureFixedNote(shell, buildFixedNotePathFromName(folder, UNTITLED_FILENAME, shell));
