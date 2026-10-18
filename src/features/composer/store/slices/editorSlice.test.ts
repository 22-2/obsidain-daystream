import { obsidianMoment } from "src/core/platform/obsidian-globals";
import type { DSTRStorage } from "src/core/storage";
import { DEFAULT_SETTINGS } from "src/core/domain/settings";
import { INPUT_AREA_SIZE, MAIN_VIEW, STORAGE_KEYS } from "src/features/workspace/config/constants";
import { createAppStore } from "src/features/workspace/store/appStore";
import {
  getDraftMetadataStorageKey,
  getEditingPostStorageKey,
  getInputAreaSizeStorageKey,
  getInputStorageKey,
} from "src/features/composer/store/slices/inputStorage";
import type { Post } from "src/core/domain/post";
import {
  reconstructEditingPost,
  toPersistedEditingPost,
} from "src/features/composer/store/slices/editorPersistence";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type MockStorageHandle = {
  storage: DSTRStorage;
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
    } as unknown as DSTRStorage,
    values,
    set,
    get,
    remove,
  };
}

function buildPostFixture(message: string): Post {
  const noteDate = obsidianMoment("2026-03-15T00:00:00.000Z");
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

  it("日付更新でも執筆中の最大化を維持し、手動では解除できる", () => {
    const store = createAppStore();
    const { storage } = createMockStorage();
    store.setState({ storage, inputAreaSize: INPUT_AREA_SIZE.MAXIMIZED });
    store.getState().replaceInput("writing a draft");

    store.getState().setDate(store.getState().date.clone().add(1, "day"));

    expect(store.getState().inputAreaSize).toBe(INPUT_AREA_SIZE.MAXIMIZED);
    expect(store.getState().getInputValue()).toBe("writing a draft");
    store.getState().setInputAreaSize(INPUT_AREA_SIZE.DEFAULT);
    expect(store.getState().inputAreaSize).toBe(INPUT_AREA_SIZE.DEFAULT);
  });

  it("月を往復しても以前の最大化が勝手に復元されない", () => {
    const store = createAppStore();
    const { storage } = createMockStorage();
    const august = obsidianMoment("2026-08-01");
    store.setState({ storage, granularity: "month", date: august.clone() });
    store.getState().setInputAreaSize(INPUT_AREA_SIZE.MAXIMIZED);
    expect(store.getState().inputAreaSize).toBe(INPUT_AREA_SIZE.MAXIMIZED);

    store.getState().setDate(august.clone().add(1, "month"));
    expect(store.getState().inputAreaSize).toBe(INPUT_AREA_SIZE.DEFAULT);

    store.getState().setDate(august.clone());
    expect(store.getState().inputAreaSize).toBe(INPUT_AREA_SIZE.DEFAULT);
  });

  it.each(["periodic", "fixed"] as const)(
    "%s の旧最大化状態は初期化時と再訪時に復元しない",
    (noteMode) => {
      const store = createAppStore();
      const date = obsidianMoment("2026-08-01");
      const file = noteMode === "fixed" ? "dstr/a.dstr.md" : null;
      const { storage } = createMockStorage({
        [STORAGE_KEYS.GRANULARITY]: "month",
        [STORAGE_KEYS.DATE]: date.toISOString(),
        [getInputAreaSizeStorageKey(noteMode, file, "month", date.format("YYYY-MM-DD"))]:
          INPUT_AREA_SIZE.MAXIMIZED,
      });
      store.setState({ pluginSettings: DEFAULT_SETTINGS, storage, viewNoteMode: noteMode, file });

      store.getState().hydrateSettingsState();
      expect(store.getState().inputAreaSize).toBe(INPUT_AREA_SIZE.DEFAULT);

      store.getState().setDate(date.clone().add(1, "month"));
      store.getState().setDate(date.clone());
      expect(store.getState().inputAreaSize).toBe(INPUT_AREA_SIZE.DEFAULT);
    },
  );

  it("最大化を一時状態にしても日付ごとの最小化は復元する", () => {
    const store = createAppStore();
    const { storage } = createMockStorage();
    const date = obsidianMoment("2026-08-01");
    store.setState({ storage, granularity: "month", date: date.clone() });
    store.getState().setInputAreaSize(INPUT_AREA_SIZE.MINIMIZED);

    store.getState().setDate(date.clone().add(1, "month"));
    expect(store.getState().inputAreaSize).toBe(INPUT_AREA_SIZE.DEFAULT);
    store.getState().setDate(date.clone());
    expect(store.getState().inputAreaSize).toBe(INPUT_AREA_SIZE.MINIMIZED);
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
    const fixedPathA = "dstr/a.dstr.md";
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
    const fixedPathA = "dstr/a.dstr.md";
    const fixedPathB = "dstr/b.dstr.md";
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
    const fixedPath = "dstr/a.dstr.md";
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
    const fixedPath = "dstr/a.dstr.md";
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
    const fixedPath = "dstr/a.dstr.md";
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

  it("タイムラインの初期化は別タブの過去日・月粒度を引き継がず、今日の日次へ戻る", () => {
    vi.setSystemTime(new Date("2026-03-16T09:00:00Z"));
    const savedDate = "2026-02-01T00:00:00Z";
    const { storage, values } = createMockStorage({
      [STORAGE_KEYS.MAIN_VIEW]: MAIN_VIEW.DATE,
      [STORAGE_KEYS.DATE]: savedDate,
      [STORAGE_KEYS.GRANULARITY]: "month",
      [STORAGE_KEYS.THREAD_FOCUS_ROOT_ID]: "old-thread",
    });
    const initializeTimeline = () => {
      const store = createAppStore();
      store.getState().initializeAppStore({
        shell: {} as never,
        settings: DEFAULT_SETTINGS,
        storage,
        initialViewState: {
          noteMode: "periodic",
          file: null,
          fixedSessionNumber: 1,
          mainView: MAIN_VIEW.TIMELINE,
        },
      });
      return store;
    };
    const firstTab = initializeTimeline();
    expect(firstTab.getState()).toMatchObject({
      mainView: MAIN_VIEW.TIMELINE,
      displayMode: "timeline",
      granularity: "day",
      threadFocusRootId: null,
    });
    expect(firstTab.getState().date.isSame(obsidianMoment(), "day")).toBe(true);

    firstTab.getState().setDate(obsidianMoment("2026-03-10"));
    expect(values.get(STORAGE_KEYS.DATE)).toBe(savedDate);
    const secondTab = initializeTimeline();
    expect(secondTab.getState().date.isSame(obsidianMoment(), "day")).toBe(true);
    expect(firstTab.getState().date.format("YYYY-MM-DD")).toBe("2026-03-10");

    firstTab.getState().setMainView(MAIN_VIEW.DATE);
    firstTab.getState().setGranularity("month");
    firstTab.getState().setMainView(MAIN_VIEW.TIMELINE);
    expect(firstTab.getState().granularity).toBe("day");
    expect(firstTab.getState().date.isSame(obsidianMoment(), "day")).toBe(true);
    expect(values.get(STORAGE_KEYS.GRANULARITY)).toBe("month");
  });

  it("編集開始時に投稿のノート日付と表示日付を分けて保存する", () => {
    const store = createAppStore();
    const post = { ...buildPostFixture("editing post"), noteGranularity: "day" as const };
    const viewDate = obsidianMoment("2026-03-20T00:00:00.000Z");
    const { storage, values } = createMockStorage();
    store.setState({ storage, date: viewDate.clone(), granularity: "week" });

    store.getState().startEdit(post);

    expect(values.get(STORAGE_KEYS.EDITING_POST)).toMatchObject({
      noteDateStr: post.noteDate.toISOString(),
      viewDateStr: viewDate.toISOString(),
      granularity: "week",
      noteGranularity: "day",
      message: post.message,
    });
  });

  it("再起動時は編集開始時の表示日付へ戻す", () => {
    const store = createAppStore();
    const post = buildPostFixture("editing post");
    const viewDate = obsidianMoment("2026-03-20T00:00:00.000Z");
    const { storage } = createMockStorage({
      [STORAGE_KEYS.EDITING_POST]: toPersistedEditingPost(post, {
        date: viewDate,
        granularity: "day",
      }),
    });
    store.setState({ pluginSettings: DEFAULT_SETTINGS, storage });

    store.getState().hydrateSettingsState();

    expect(store.getState().date.toISOString()).toBe(viewDate.toISOString());
  });

  it("ポップアウトへ移した編集途中の入力は、元の本文と比べて送信できる", () => {
    const store = createAppStore();
    const post = buildPostFixture("original");
    const { storage } = createMockStorage();
    store.setState({ storage });
    const postInfo = toPersistedEditingPost(post, { date: obsidianMoment(), granularity: "day" });

    // EditorOnlyReactView と同じ順で、元の投稿を編集対象にしてから編集途中の入力を戻す。
    store.getState().startEdit(reconstructEditingPost(postInfo, "edited"));
    store.getState().replaceInput("edited");

    expect(store.getState().editingPost?.message).toBe("original");
    expect(store.getState().getInputValue()).toBe("edited");
    expect(store.getState().canSubmit([])).toBe(true);
  });

  it("固定ノートの編集中投稿は、定期ノートとは別のキーへ保存する", () => {
    const store = createAppStore();
    const post = buildPostFixture("fixed editing");
    const fixedPath = "dstr/a.dstr.md";
    const { storage, values } = createMockStorage();
    store.setState({ storage, viewNoteMode: "fixed", file: fixedPath, fixedSessionNumber: 2 });

    store.getState().startEdit(post);

    expect(values.has(STORAGE_KEYS.EDITING_POST)).toBe(false);
    expect(values.get(getEditingPostStorageKey("fixed", fixedPath, 2))).toMatchObject({
      id: post.id,
    });
  });

  it("ビューを切り替えると編集中投稿も切替先のものに差し替え、戻ると続きから編集できる", () => {
    const store = createAppStore();
    const post = buildPostFixture("periodic editing");
    const fixedPath = "dstr/a.dstr.md";
    const { storage } = createMockStorage();
    store.setState({ storage, viewNoteMode: "periodic" });
    store.getState().startEdit(post);
    store.getState().replaceInput("periodic edited");

    store.getState().setViewContext({ noteMode: "fixed", file: fixedPath });

    expect(store.getState().editingPost).toBeNull();
    expect(store.getState().getInputValue()).toBe("");

    store.getState().setViewContext({ noteMode: "periodic", file: null });

    expect(store.getState().editingPost?.id).toBe(post.id);
    expect(store.getState().editingPost?.message).toBe(post.message);
    expect(store.getState().getInputValue()).toBe("periodic edited");
  });

  it("固定ノートの名前が変わっても、入力中の本文を入れ替えずに新しいパスへ保存する", () => {
    const oldPath = "dstr/before.dstr.md";
    const newPath = "dstr/after.dstr.md";
    const store = createAppStore();
    const { storage, values } = createMockStorage();
    store.setState({ storage, viewNoteMode: "fixed", file: oldPath, fixedSessionNumber: 2 });
    store.getState().syncInputSession("typing");

    store.getState().followRenamedFile(oldPath, newPath);
    vi.runAllTimers();

    expect(store.getState().file).toBe(newPath);
    expect(store.getState().getInputValue()).toBe("typing");
    expect(values.get(getInputStorageKey("fixed", newPath, 2))).toBe("typing");
    expect(values.has(getInputStorageKey("fixed", oldPath, 2))).toBe(false);
  });

  it("固定ノートの名前が変わると、編集中投稿も新しいパスのキーへ移す", () => {
    const oldPath = "dstr/before.dstr.md";
    const newPath = "dstr/after.dstr.md";
    const store = createAppStore();
    const post = { ...buildPostFixture("fixed editing"), path: oldPath };
    const { storage, values } = createMockStorage();
    store.setState({ storage, viewNoteMode: "fixed", file: oldPath, fixedSessionNumber: 2 });
    store.getState().startEdit(post);

    store.getState().followRenamedFile(oldPath, newPath);

    expect(store.getState().editingPost?.path).toBe(newPath);
    expect(values.has(getEditingPostStorageKey("fixed", oldPath, 2))).toBe(false);
    expect(values.get(getEditingPostStorageKey("fixed", newPath, 2))).toMatchObject({
      id: post.id,
      path: newPath,
    });
  });
});
