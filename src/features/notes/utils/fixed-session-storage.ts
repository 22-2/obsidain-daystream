import type { DaystreamStorage } from "src/core/storage";
import type { ObsidianAppShell } from "src/core/platform/obsidian-shell";
import { STORAGE_KEYS } from "src/features/workspace/config/constants";

export interface FixedSessionLocalMeta {
  createdAt?: string;
  name?: string;
  pinned?: boolean;
}

export type FixedSessionMetaMap = Record<string, FixedSessionLocalMeta>;

const FIXED_SESSION_META_FILE_SUFFIX = ".fixed-session-meta.json";

function getFixedSessionMetaStorageKey(file: string | null): string {
  if (!file) {
    return STORAGE_KEYS.FIXED_SESSION_META;
  }

  return `${STORAGE_KEYS.FIXED_SESSION_META}:${encodeURIComponent(file)}`;
}

function getFixedSessionLastOpenedStorageKey(file: string | null): string {
  if (!file) {
    return STORAGE_KEYS.FIXED_SESSION_LAST_OPENED;
  }

  return `${STORAGE_KEYS.FIXED_SESSION_LAST_OPENED}:${encodeURIComponent(file)}`;
}

function getFixedSessionMetaFilePath(file: string): string {
  if (file.toLowerCase().endsWith(".md")) {
    return `${file.slice(0, -3)}${FIXED_SESSION_META_FILE_SUFFIX}`;
  }

  return `${file}${FIXED_SESSION_META_FILE_SUFFIX}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeFixedSessionMetaMap(raw: unknown): FixedSessionMetaMap {
  if (!isRecord(raw)) {
    return {};
  }

  const next: FixedSessionMetaMap = {};

  for (const [sessionKey, value] of Object.entries(raw)) {
    if (!/^\d+$/.test(sessionKey) || !isRecord(value)) {
      continue;
    }

    const meta: FixedSessionLocalMeta = {};

    if (typeof value.createdAt === "string") {
      meta.createdAt = value.createdAt;
    }
    if (typeof value.name === "string") {
      meta.name = value.name;
    }
    if (typeof value.pinned === "boolean") {
      meta.pinned = value.pinned;
    }

    next[sessionKey] = meta;
  }

  return next;
}

async function readFixedSessionMetaFromFile(
  shell: ObsidianAppShell,
  file: string,
): Promise<FixedSessionMetaMap | null> {
  const filePath = getFixedSessionMetaFilePath(file);

  try {
    const raw = await shell.loadFile(filePath);
    const parsed = JSON.parse(raw) as unknown;
    return sanitizeFixedSessionMetaMap(parsed);
  } catch {
    return null;
  }
}

async function writeFixedSessionMetaToFile(
  shell: ObsidianAppShell,
  file: string,
  nextMeta: FixedSessionMetaMap,
): Promise<void> {
  const filePath = getFixedSessionMetaFilePath(file);
  const serialized = `${JSON.stringify(nextMeta, null, 2)}\n`;

  // 意図: fixedSessionMeta は vault 内ファイルとして保持し、端末/同期先を跨いでも同じセッション表示情報を再現する。
  await shell.writeFile(filePath, serialized);
}

async function readAndMigrateFromLegacyStorage(
  shell: ObsidianAppShell,
  storage: DaystreamStorage | null,
  file: string,
): Promise<FixedSessionMetaMap> {
  if (!storage) {
    return {};
  }

  const legacyStorageKey = getFixedSessionMetaStorageKey(file);
  const migrated = sanitizeFixedSessionMetaMap(
    storage.get<FixedSessionMetaMap>(legacyStorageKey, {}),
  );

  if (Object.keys(migrated).length === 0) {
    return {};
  }

  // 意図: 初回読み込み時に旧 local storage から sidecar へ寄せ、以後はファイルを唯一の正にして二重管理を避ける。
  await writeFixedSessionMetaToFile(shell, file, migrated);
  storage.remove(legacyStorageKey);

  return migrated;
}

export async function readFixedSessionMeta(
  shell: ObsidianAppShell,
  storage: DaystreamStorage | null,
  file: string | null,
): Promise<FixedSessionMetaMap> {
  if (!file) {
    return {};
  }

  const fromFile = await readFixedSessionMetaFromFile(shell, file);
  if (fromFile) {
    return fromFile;
  }

  return readAndMigrateFromLegacyStorage(shell, storage, file);
}

export async function writeFixedSessionMeta(
  shell: ObsidianAppShell,
  storage: DaystreamStorage | null,
  file: string | null,
  nextMeta: FixedSessionMetaMap,
): Promise<void> {
  if (!file) {
    return;
  }

  await writeFixedSessionMetaToFile(shell, file, nextMeta);

  if (storage) {
    storage.remove(getFixedSessionMetaStorageKey(file));
  }
}

export async function updateFixedSessionMeta(
  shell: ObsidianAppShell,
  storage: DaystreamStorage | null,
  file: string | null,
  sessionNumber: number,
  updater: (prev: FixedSessionLocalMeta) => FixedSessionLocalMeta,
): Promise<FixedSessionMetaMap> {
  const current = await readFixedSessionMeta(shell, storage, file);
  const nextForSession = updater(current[String(sessionNumber)] ?? {});
  const next = {
    ...current,
    [String(sessionNumber)]: nextForSession,
  };

  await writeFixedSessionMeta(shell, storage, file, next);
  return next;
}

export async function removeFixedSessionMeta(
  shell: ObsidianAppShell,
  storage: DaystreamStorage | null,
  file: string | null,
  sessionNumber: number,
): Promise<FixedSessionMetaMap> {
  const current = await readFixedSessionMeta(shell, storage, file);
  const next = { ...current };

  delete next[String(sessionNumber)];
  await writeFixedSessionMeta(shell, storage, file, next);
  return next;
}

export function readLastOpenedFixedSessionNumber(
  storage: DaystreamStorage | null,
  file: string | null,
): number | null {
  if (!storage || !file) {
    return null;
  }

  const rawValue = storage.get<unknown>(getFixedSessionLastOpenedStorageKey(file), null);

  return typeof rawValue === "number" && Number.isInteger(rawValue) && rawValue >= 1
    ? rawValue
    : null;
}

export function writeLastOpenedFixedSessionNumber(
  storage: DaystreamStorage | null,
  file: string | null,
  sessionNumber: number,
): void {
  if (!storage || !file) {
    return;
  }

  if (!Number.isInteger(sessionNumber) || sessionNumber < 1) {
    return;
  }

  // 意図: タブを閉じて新しい leaf で fixed ノートを開き直しても、最後に見ていた session を復元したい。
  // viewState が失われる reopen 経路に備えて、ノート単位で直近 session を軽量に永続化する。
  storage.set(getFixedSessionLastOpenedStorageKey(file), sessionNumber);
}
