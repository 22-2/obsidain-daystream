import type { DaystreamStorage } from "src/core/storage";
import type { ObsidianAppShell } from "src/core/platform/obsidian-shell";
import { STORAGE_KEYS } from "src/features/workspace/config/constants";
import {
  readFixedSessionMeta,
  readLastOpenedFixedSessionNumber,
  writeLastOpenedFixedSessionNumber,
} from "src/features/notes/utils/fixed-session-storage";
import { describe, expect, it, vi } from "vitest";

type MockStorageHandle = {
  storage: DaystreamStorage;
  get: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
};

function createMockStorage(initialValues: Record<string, unknown> = {}): MockStorageHandle {
  const values = new Map<string, unknown>(Object.entries(initialValues));

  const get = vi.fn(<T>(key: string, defaultValue: T): T => {
    return values.has(key) ? (values.get(key) as T) : defaultValue;
  });
  const remove = vi.fn((key: string) => {
    values.delete(key);
  });

  return {
    storage: {
      get,
      remove,
      set: vi.fn(),
    } as unknown as DaystreamStorage,
    get,
    remove,
  };
}

function createMockShell(): {
  shell: ObsidianAppShell;
  loadFile: ReturnType<typeof vi.fn>;
  writeFile: ReturnType<typeof vi.fn>;
} {
  const loadFile = vi.fn();
  const writeFile = vi.fn(async () => {});

  return {
    shell: {
      loadFile,
      writeFile,
    } as unknown as ObsidianAppShell,
    loadFile,
    writeFile,
  };
}

describe("fixed-session-storage", () => {
  it("sidecar ファイルがあれば fixedSessionMeta をそれを正として読む", async () => {
    const filePath = "MFDI/Inbox.mfdi.md";
    const { shell, loadFile } = createMockShell();
    const { storage, get } = createMockStorage({
      [`${STORAGE_KEYS.FIXED_SESSION_META}:${encodeURIComponent(filePath)}`]: {
        "9": { name: "legacy" },
      },
    });

    loadFile.mockResolvedValue(
      JSON.stringify({
        "2": {
          createdAt: "2026-05-01T10:00:00.000Z",
          name: "Focus",
          pinned: true,
        },
      }),
    );

    const result = await readFixedSessionMeta(shell, storage, filePath);

    expect(result).toEqual({
      "2": {
        createdAt: "2026-05-01T10:00:00.000Z",
        name: "Focus",
        pinned: true,
      },
    });
    expect(loadFile).toHaveBeenCalledWith("MFDI/Inbox.mfdi.fixed-session-meta.json");
    expect(get).not.toHaveBeenCalled();
  });

  it("sidecar が無い場合は旧 storage から移行してファイルへ保存する", async () => {
    const filePath = "MFDI/Inbox.mfdi.md";
    const legacyStorageKey = `${STORAGE_KEYS.FIXED_SESSION_META}:${encodeURIComponent(filePath)}`;
    const { shell, loadFile, writeFile } = createMockShell();
    const { storage, remove } = createMockStorage({
      [legacyStorageKey]: {
        "3": {
          createdAt: "2026-05-02T08:30:00.000Z",
          name: "Migrated",
          pinned: false,
        },
      },
    });

    loadFile.mockRejectedValue(new Error("not found"));

    const result = await readFixedSessionMeta(shell, storage, filePath);

    expect(result).toEqual({
      "3": {
        createdAt: "2026-05-02T08:30:00.000Z",
        name: "Migrated",
        pinned: false,
      },
    });
    expect(writeFile).toHaveBeenCalledWith(
      "MFDI/Inbox.mfdi.fixed-session-meta.json",
      `${JSON.stringify(result, null, 2)}\n`,
    );
    expect(remove).toHaveBeenCalledWith(legacyStorageKey);
  });

  it("ノートごとの last opened session を storage から読む", () => {
    const filePath = "MFDI/Inbox.mfdi.md";
    const { storage } = createMockStorage({
      [`${STORAGE_KEYS.FIXED_SESSION_LAST_OPENED}:${encodeURIComponent(filePath)}`]: 7,
    });

    expect(readLastOpenedFixedSessionNumber(storage, filePath)).toBe(7);
  });

  it("ノートごとの last opened session を storage に書く", () => {
    const filePath = "MFDI/Inbox.mfdi.md";
    const { storage } = createMockStorage();

    writeLastOpenedFixedSessionNumber(storage, filePath, 3);

    expect(storage.set).toHaveBeenCalledWith(
      `${STORAGE_KEYS.FIXED_SESSION_LAST_OPENED}:${encodeURIComponent(filePath)}`,
      3,
    );
  });
});
