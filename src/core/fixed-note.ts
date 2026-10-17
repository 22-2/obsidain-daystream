import { normalizePath, TFile } from "obsidian";
import { LEGACY_DAYSTREAM_IDENTIFIERS } from "src/core/legacy-identifiers";
import { ensureExtension } from "src/core/path";
import type { ObsidianAppShell } from "src/core/platform/obsidian-shell";

export const FILENAME_SUFFIX = ".dstr.md";
export const UNTITLED_FILENAME = `Untitled`;

// --- ユーティリティ ---
const norm = (p: string) => normalizePath(p.trim()).replace(/\/$/, "");

export const normalizeFixedNotePath = (p: string) => {
  const s = norm(p);
  return s && !s.toLowerCase().endsWith(".md") ? `${s}.md` : s;
};

export const isDSTRFixedNotePath = (p: string) => {
  const normalizedPath = normalizePath(p).toLowerCase();
  return (
    normalizedPath.endsWith(FILENAME_SUFFIX) ||
    normalizedPath.endsWith(LEGACY_DAYSTREAM_IDENTIFIERS.fixedNoteSuffix)
  );
};

function toCurrentFixedNotePath(path: string): string {
  const lowerPath = path.toLowerCase();
  const legacySuffix = LEGACY_DAYSTREAM_IDENTIFIERS.fixedNoteSuffix;
  return lowerPath.endsWith(legacySuffix)
    ? `${path.slice(0, -legacySuffix.length)}${FILENAME_SUFFIX}`
    : path;
}

function toLegacyFixedNotePath(path: string): string {
  const lowerPath = path.toLowerCase();
  return lowerPath.endsWith(FILENAME_SUFFIX)
    ? `${path.slice(0, -FILENAME_SUFFIX.length)}${LEGACY_DAYSTREAM_IDENTIFIERS.fixedNoteSuffix}`
    : path;
}

// --- 取得・作成 ---
export function resolveFixedNote(shell: ObsidianAppShell, raw: string | null): TFile | null {
  const path = normalizeFixedNotePath(raw ?? "");
  const filePaths = path ? [...new Set([path, toCurrentFixedNotePath(path)])] : [];
  const file = filePaths.map((filePath) => shell.getAbstractFileByPath(filePath)).find(Boolean);
  return file instanceof TFile ? file : null;
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
  let path = normalizeFixedNotePath(raw);
  if (!path) throw new Error("path is empty");

  const existing = resolveFixedNote(shell, path);
  if (existing) return existing;

  path = toCurrentFixedNotePath(path);
  const migrated = resolveFixedNote(shell, path);
  if (migrated) return migrated;

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
  while (
    shell.getAbstractFileByPath(path) ||
    shell.getAbstractFileByPath(toLegacyFixedNotePath(path))
  ) {
    path = base.replace(FILENAME_SUFFIX, ` ${i++}${FILENAME_SUFFIX}`);
  }
  return path;
}

export const createNewFixedNote = (shell: ObsidianAppShell, folder: string) =>
  ensureFixedNote(shell, buildFixedNotePathFromName(folder, UNTITLED_FILENAME, shell));
