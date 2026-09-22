import type { MFDIStorage } from "src/core/storage";
import { DEFAULT_SETTINGS } from "src/settings";
import { INPUT_AREA_SIZE, MAIN_VIEW, STORAGE_KEYS } from "src/ui/config/consntants";
import { createAppStore } from "src/ui/store/appStore";
import { getDraftMetadataStorageKey, getInputStorageKey } from "src/ui/store/slices/inputStorage";
import type { Post } from "src/ui/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type MockStorageHandle = {
  storage: MFDIStorage;
  values: Map<string, unknown>;
  set: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
};

function createMockStorage(initialValues: Record<string, unknown> = {}): MockStorageHandle {
  const values = new Map<string, unknown>(Object.entries(initialValues));

  const set = vi.fn(<T>(key: string, value: T) => {
    values.set(key, value);
  });
  const get = vi.fn(<T>(key: string, defaultValue: T): T => {
    return values.has(key) ? (values.get(key) as T) : defaultValue;
  });
  const remove = vi.fn((key: string) => {
    values.delete(key);
  });

  return {
    storage: {
      set,
      get,
      remove,
    } as unknown as MFDIStorage,
    values,
    set,
    get,
    remove,
  };
}

function buildPostFixture(message: string): Post {
  const noteDate = window.moment("2026-03-15T00:00:00.000Z");
  const timestamp = noteDate.clone().hour(12);

  return {
    id: "post-1",
    path: "Daily/2026-03-15.md",
    threadRootId: null,
    timestamp,
    noteDate,
    message,
    metadata: { tag: "debug" },
    offset: 42,
    startOffset: 42,
    endOffset: 42 + message.length,
    bodyStartOffset: 42,
    kind: "thino",
  };
}

describe("editorSlice", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("コンポーザの表示状態を storage に保存せず、再初期化時は閉じたままにする", () => {
    const store = createAppStore();
    const { storage, values } = createMockStorage();

    store.setState({ storage });
    store.getState().openComposer();
    expect(store.getState().composerOpen).toBe(true);
    expect(values.has(STORAGE_KEYS.COMPOSER_OPEN)).toBe(false);

    // 旧バージョンの値が残っていても、composer の開閉状態はタブをまたいで復元しない。
    values.set(STORAGE_KEYS.COMPOSER_OPEN, true);

    const reopenedStore = createAppStore();
    reopenedStore.setState({ storage });
    reopenedStore.getState().hydrateEditorState();
    expect(reopenedStore.getState().composerOpen).toBe(false);
  });

  it("コンポーザを閉じると入力を下書きへ移し、次回は復元しない", () => {
    const store = createAppStore();
    const draft = "closed composer draft";
    const { storage, values } = createMockStorage();

    store.setState({
      storage,
      composerOpen: true,
      inputSnapshot: draft,
    });

    store.getState().closeComposer();

    expect(store.getState().composerOpen).toBe(false);
    expect(store.getState().inputSnapshot).toBe("");
    expect(store.getState().drafts).toHaveLength(1);
    expect(store.getState().drafts[0]?.content).toBe(draft);
    expect(values.has(STORAGE_KEYS.COMPOSER_OPEN)).toBe(false);
    expect(values.get(getInputStorageKey("periodic", null))).toBe("");

    const reopenedStore = createAppStore();
    reopenedStore.setState({ storage });
    reopenedStore.getState().hydrateEditorState();
    reopenedStore.getState().hydrateDraftState();

    expect(reopenedStore.getState().inputSnapshot).toBe("");
    expect(reopenedStore.getState().composerOpen).toBe(false);
    expect(reopenedStore.getState().drafts[0]?.content).toBe(draft);
  });

  it("hydrateEditorState は保存済み入力を snapshot と editor に復元する", () => {
    const store = createAppStore();
    const persistedInput = "restored draft";
    const { storage } = createMockStorage({
      [STORAGE_KEYS.INPUT_PERIODIC]: persistedInput,
    });

    store.setState({ storage });

    const versionBefore = store.getState().inputSnapshotVersion;

    store.getState().hydrateEditorState();

    expect(store.getState().inputSnapshot).toBe(persistedInput);
    expect(store.getState().getInputValue()).toBe(persistedInput);
    expect(store.getState().inputSnapshotVersion).toBeGreaterThan(versionBefore);
  });

  it("hydrateEditorState は編集中投稿の復元情報も再構築する", () => {
    const store = createAppStore();
    const post = buildPostFixture("editing draft");
    const { storage } = createMockStorage({
      [STORAGE_KEYS.INPUT_PERIODIC]: post.message,
      [STORAGE_KEYS.EDITING_POST]: {
        id: post.id,
        path: post.path,
        timestampStr: post.timestamp.toISOString(),
        metadataStr: JSON.stringify(post.metadata),
        noteDateStr: post.noteDate.toISOString(),
        offset: post.startOffset,
        granularity: "day",
      },
    });

    store.setState({ storage });

    store.getState().hydrateEditorState();

    const restoredPost = store.getState().editingPost;
    expect(restoredPost).not.toBeNull();
    expect(restoredPost?.id).toBe(post.id);
    expect(restoredPost?.path).toBe(post.path);
    expect(restoredPost?.message).toBe(post.message);
    expect(restoredPost?.metadata).toEqual(post.metadata);
    expect(restoredPost?.timestamp.toISOString()).toBe(post.timestamp.toISOString());
    expect(restoredPost?.noteDate.toISOString()).toBe(post.noteDate.toISOString());
    expect(store.getState().editingPostOffset).toBe(post.startOffset);
  });

  it("maximized の入力欄は投稿の編集開始時にも維持する", () => {
    const store = createAppStore();
    const post = buildPostFixture("editing post");
    const { storage } = createMockStorage();

    store.setState({
      storage,
      inputAreaSize: INPUT_AREA_SIZE.MAXIMIZED,
    });

    store.getState().startEdit(post);

    expect(store.getState().inputAreaSize).toBe(INPUT_AREA_SIZE.MAXIMIZED);
    expect(store.getState().editingPost?.id).toBe(post.id);
  });

  it("minimized の入力欄は投稿の編集開始時に表示できるサイズへ戻す", () => {
    const store = createAppStore();
    const post = buildPostFixture("editing post");
    const { storage } = createMockStorage();

    store.setState({
      storage,
      inputAreaSize: INPUT_AREA_SIZE.MINIMIZED,
    });

    store.getState().startEdit(post);

    expect(store.getState().inputAreaSize).toBe(INPUT_AREA_SIZE.DEFAULT);
  });

  it("view切替時にperiodic/fixedで入力復元を分離する", () => {
    const fixedPathA = "MFDI/a.mfdi.md";
    const store = createAppStore();
    const { storage, set: setStorage } = createMockStorage({
      [STORAGE_KEYS.INPUT_PERIODIC]: "periodic draft",
      [getInputStorageKey("fixed", fixedPathA)]: "fixed draft",
    });

    store.setState({
      storage,
      viewNoteMode: "periodic",
      inputSnapshot: "periodic in-memory",
    });

    const versionBefore = store.getState().inputSnapshotVersion;

    store.getState().setViewContext({ noteMode: "fixed", file: fixedPathA });

    expect(store.getState().viewNoteMode).toBe("fixed");
    expect(store.getState().inputSnapshot).toBe("fixed draft");
    expect(store.getState().inputSnapshotVersion).toBeGreaterThan(versionBefore);
    expect(setStorage).toHaveBeenCalledWith(
      getInputStorageKey("periodic", null),
      "periodic in-memory",
    );
    expect(setStorage).toHaveBeenCalledWith(getInputStorageKey("fixed", fixedPathA), "fixed draft");
  });

  it("fixedノート間の切替で入力復元をファイル単位に分離する", () => {
    const fixedPathA = "MFDI/a.mfdi.md";
    const fixedPathB = "MFDI/b.mfdi.md";
    const store = createAppStore();
    const { storage, set: setStorage } = createMockStorage({
      [getInputStorageKey("fixed", fixedPathA)]: "draft-a",
      [getInputStorageKey("fixed", fixedPathB)]: "draft-b",
    });

    store.setState({
      storage,
      viewNoteMode: "fixed",
      file: fixedPathA,
      inputSnapshot: "draft-a-modified",
    });

    const versionBefore = store.getState().inputSnapshotVersion;

    store.getState().setViewContext({ noteMode: "fixed", file: fixedPathB });

    expect(store.getState().viewNoteMode).toBe("fixed");
    expect(store.getState().file).toBe(fixedPathB);
    expect(store.getState().inputSnapshot).toBe("draft-b");
    expect(store.getState().inputSnapshotVersion).toBeGreaterThan(versionBefore);
    expect(setStorage).toHaveBeenCalledWith(
      getInputStorageKey("fixed", fixedPathA),
      "draft-a-modified",
    );
  });

  it("fixed session 切替で draft と metadata を session 単位に分離する", () => {
    const fixedPath = "MFDI/a.mfdi.md";
    const store = createAppStore();
    const { storage, set: setStorage } = createMockStorage({
      [getInputStorageKey("fixed", fixedPath, 2)]: "draft-session-2",
      [getDraftMetadataStorageKey("fixed", fixedPath, 2)]: {
        draftMetadata: { pinned: "true" },
        draftMetadataBase: { pinned: "true" },
      },
    });

    store.setState({
      storage,
      viewNoteMode: "fixed",
      file: fixedPath,
      fixedSessionNumber: 1,
      inputSnapshot: "draft-session-1",
      draftMetadata: { tags: "alpha" },
      draftMetadataBase: { tags: "alpha" },
    });

    store.getState().setFixedSessionNumber(2);

    expect(store.getState().fixedSessionNumber).toBe(2);
    expect(store.getState().inputSnapshot).toBe("draft-session-2");
    expect(store.getState().draftMetadata).toEqual({ pinned: "true" });
    expect(store.getState().draftMetadataBase).toEqual({ pinned: "true" });
    expect(setStorage).toHaveBeenCalledWith(
      getInputStorageKey("fixed", fixedPath, 1),
      "draft-session-1",
    );
    expect(setStorage).toHaveBeenCalledWith(getDraftMetadataStorageKey("fixed", fixedPath, 1), {
      draftMetadata: { tags: "alpha" },
      draftMetadataBase: { tags: "alpha" },
    });
  });

  it("setViewContext は fixed ノート restore 時に session もまとめて復元する", () => {
    const fixedPath = "MFDI/a.mfdi.md";
    const store = createAppStore();
    const { storage, set: setStorage } = createMockStorage({
      [getInputStorageKey("fixed", fixedPath, 4)]: "draft-session-4",
      [getDraftMetadataStorageKey("fixed", fixedPath, 4)]: {
        draftMetadata: { restored: "yes" },
        draftMetadataBase: { restored: "yes" },
      },
    });

    store.setState({
      storage,
      viewNoteMode: "periodic",
      file: null,
      fixedSessionNumber: 1,
      inputSnapshot: "periodic in-memory",
      draftMetadata: { tags: "alpha" },
      draftMetadataBase: { tags: "alpha" },
    });

    store.getState().setViewContext({
      noteMode: "fixed",
      file: fixedPath,
      fixedSessionNumber: 4,
    });

    expect(store.getState().viewNoteMode).toBe("fixed");
    expect(store.getState().file).toBe(fixedPath);
    expect(store.getState().fixedSessionNumber).toBe(4);
    expect(store.getState().inputSnapshot).toBe("draft-session-4");
    expect(store.getState().draftMetadata).toEqual({ restored: "yes" });
    expect(store.getState().draftMetadataBase).toEqual({ restored: "yes" });
    expect(setStorage).toHaveBeenCalledWith(
      getInputStorageKey("periodic", null),
      "periodic in-memory",
    );
  });

  it("initializeAppStore は restore 済み fixed session の入力を直接 hydrate する", () => {
    const fixedPath = "MFDI/a.mfdi.md";
    const store = createAppStore();
    const { storage } = createMockStorage({
      [getInputStorageKey("fixed", fixedPath, 4)]: "draft-session-4",
      [getDraftMetadataStorageKey("fixed", fixedPath, 4)]: {
        draftMetadata: { restored: "yes" },
        draftMetadataBase: { restored: "yes" },
      },
    });

    store.getState().initializeAppStore({
      shell: {} as never,
      settings: DEFAULT_SETTINGS,
      storage,
      initialViewState: {
        noteMode: "fixed",
        file: fixedPath,
        fixedSessionNumber: 4,
      },
    });

    expect(store.getState().viewNoteMode).toBe("fixed");
    expect(store.getState().file).toBe(fixedPath);
    expect(store.getState().fixedSessionNumber).toBe(4);
    expect(store.getState().inputSnapshot).toBe("draft-session-4");
    expect(store.getState().draftMetadata).toEqual({ restored: "yes" });
    expect(store.getState().draftMetadataBase).toEqual({ restored: "yes" });
  });

  it("initializeAppStore は view state の mainView を vault の保存値より優先する", () => {
    const store = createAppStore();
    const { storage } = createMockStorage({
      [STORAGE_KEYS.MAIN_VIEW]: MAIN_VIEW.TIMELINE,
    });

    store.getState().initializeAppStore({
      shell: {} as never,
      settings: DEFAULT_SETTINGS,
      storage,
      initialViewState: {
        noteMode: "periodic",
        file: null,
        fixedSessionNumber: 1,
        mainView: MAIN_VIEW.DATE,
      },
    });

    expect(store.getState()).toMatchObject({
      mainView: MAIN_VIEW.DATE,
      displayMode: "focus",
      contentView: "timeline",
      asTask: false,
    });
  });
});
