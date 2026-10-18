import type { ViewState } from "obsidian";
import type { DSTRStorage } from "src/core/storage";
import {
  getDraftMetadataStorageKey,
  getInputAreaSizeStorageKey,
  getInputStorageKey,
} from "src/features/composer/store/slices/inputStorage";
import {
  followRenamedFixedNoteLeaves,
  moveFixedNoteStorage,
} from "src/features/notes/utils/follow-renamed-fixed-note";
import { getFixedSessionLastOpenedStorageKey } from "src/features/notes/utils/fixed-session-storage";
import { describe, expect, it, vi, type Mock } from "vitest";

const OLD = "dstr/Before.dstr.md";
const NEW = "dstr/After.dstr.md";

function entry(type: string, file: string) {
  return { state: { type, state: { file } }, eState: {} };
}

type TestLeaf = {
  getViewState: Mock<() => { type: string; state?: Record<string, unknown> }>;
  setViewState: Mock<(state: ViewState) => Promise<void>>;
  view?: unknown;
  history?: { backHistory: ReturnType<typeof entry>[]; forwardHistory: ReturnType<typeof entry>[] };
};

function createLeaf(params: {
  current: { type: string; state?: Record<string, unknown> };
  view?: unknown;
  backHistory?: ReturnType<typeof entry>[];
}): TestLeaf {
  return {
    getViewState: vi.fn(() => params.current),
    setViewState: vi.fn(async (_state: ViewState) => {}),
    view: params.view,
    history: { backHistory: params.backHistory ?? [], forwardHistory: [] },
  };
}

function createStorage(initialValues: Record<string, unknown> = {}) {
  const values = new Map<string, unknown>(Object.entries(initialValues));
  const storage = {
    get: <T>(key: string, defaultValue: T): T =>
      values.has(key) ? (values.get(key) as T) : defaultValue,
    set: <T>(key: string, value: T) => {
      values.set(key, value);
    },
    remove: (key: string) => {
      values.delete(key);
    },
  } as unknown as DSTRStorage;
  return { storage, values };
}

describe("followRenamedFixedNoteLeaves", () => {
  it("読み込み済みの Daystream ビューには追従メソッドで新しいパスを渡す", async () => {
    const followRenamedFixedNote = vi.fn();
    const leaf = createLeaf({
      current: { type: "dstr-view", state: { noteMode: "fixed", file: OLD } },
      view: { followRenamedFixedNote },
    });

    await followRenamedFixedNoteLeaves([leaf], OLD, NEW);

    expect(followRenamedFixedNote).toHaveBeenCalledWith(OLD, NEW);
    expect(leaf.setViewState).not.toHaveBeenCalled();
  });

  it("ビューが未生成の leaf は保存された view state のパスを書き換える", async () => {
    const deferred = createLeaf({
      current: { type: "dstr-view", state: { noteMode: "fixed", file: OLD, fixedSessionNumber: 2 } },
    });
    const other = createLeaf({ current: { type: "dstr-view", state: { file: "dstr/Other.dstr.md" } } });

    await followRenamedFixedNoteLeaves([deferred, other], OLD, NEW);

    expect(deferred.setViewState).toHaveBeenCalledWith({
      type: "dstr-view",
      state: { noteMode: "fixed", file: NEW, fixedSessionNumber: 2 },
    });
    expect(other.setViewState).not.toHaveBeenCalled();
  });

  it("戻る/進む履歴の旧パスを新しいパスへ書き換える", async () => {
    const leaf = createLeaf({
      current: { type: "markdown", state: { file: "a.md" } },
      backHistory: [entry("dstr-view", OLD), entry("markdown", "b.md")],
    });

    await followRenamedFixedNoteLeaves([leaf], OLD, NEW);

    expect(leaf.history?.backHistory).toEqual([entry("dstr-view", NEW), entry("markdown", "b.md")]);
  });
});

describe("moveFixedNoteStorage", () => {
  it("セッションごとの下書きと、ノート単位の保存値を新しいパスへ移す", () => {
    const { storage, values } = createStorage({
      [getInputStorageKey("fixed", OLD, 1)]: "session one",
      [getInputStorageKey("fixed", OLD, 3)]: "session three",
      [getDraftMetadataStorageKey("fixed", OLD, 3)]: { draftMetadata: { pinned: "1" }, draftMetadataBase: {} },
      [getInputAreaSizeStorageKey("fixed", OLD, "day", "")]: "minimized",
      [getFixedSessionLastOpenedStorageKey(OLD)]: 3,
    });

    moveFixedNoteStorage(storage, OLD, NEW, [1, 3]);

    expect(values.get(getInputStorageKey("fixed", NEW, 1))).toBe("session one");
    expect(values.get(getInputStorageKey("fixed", NEW, 3))).toBe("session three");
    expect(values.get(getDraftMetadataStorageKey("fixed", NEW, 3))).toEqual({
      draftMetadata: { pinned: "1" },
      draftMetadataBase: {},
    });
    expect(values.get(getInputAreaSizeStorageKey("fixed", NEW, "day", ""))).toBe("minimized");
    expect(values.get(getFixedSessionLastOpenedStorageKey(NEW))).toBe(3);
    expect([...values.keys()].some((key) => key.includes(encodeURIComponent(OLD)))).toBe(false);
  });

  it("開いているビューが新しいパスへ保存した最新の入力を上書きしない", () => {
    const { storage, values } = createStorage({
      [getInputStorageKey("fixed", OLD, 1)]: "stale",
      [getInputStorageKey("fixed", NEW, 1)]: "latest",
    });

    moveFixedNoteStorage(storage, OLD, NEW, [1]);

    expect(values.get(getInputStorageKey("fixed", NEW, 1))).toBe("latest");
    expect(values.has(getInputStorageKey("fixed", OLD, 1))).toBe(false);
  });
});
