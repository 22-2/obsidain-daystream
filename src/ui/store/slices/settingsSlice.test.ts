// @vitest-environment jsdom
import { CONTENT_VIEW, DISPLAY_MODE, MAIN_VIEW } from "src/ui/config/consntants";
import { settingsStore } from "src/ui/store/settingsStore";
import {
  createSettingsSlice,
  isPastDateReadOnly,
  isViewReadOnly,
} from "src/ui/store/slices/settingsSlice";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("settingsSlice", () => {
  const today = window.moment("2026-03-16T09:00:00.000Z");
  const yesterday = today.clone().subtract(1, "day");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(today.toDate());
    settingsStore.setState({
      pluginSettings: {
        postFormatOption: "Thino",
        insertAfter: "## Thino",
        enabledCardView: true,
        autoToggleSidebar: true,
        debugMode: false,
        allowEditingPastNotes: false,
        updateDateStrategy: "never",
        topics: [],
        activeTopic: "",
        files: [],
        editorExpansionMode: "default",
        fullScanIntervalHours: 24,
        openInNewWindowMode: "always",
        ctrlEnterSends: false,
      },
      granularity: "day",
      date: today.clone(),
      displayMode: DISPLAY_MODE.FOCUS,
      mainView: MAIN_VIEW.DATE,
      threadFocusRootId: null,
    });
  });

  it("過去ノート編集設定がオフなら過去日は読み取り専用になる", () => {
    expect(
      isPastDateReadOnly({
        date: yesterday,
        granularity: "day",
        allowEditingPastNotes: false,
      }),
    ).toBe(true);

    expect(
      isViewReadOnly({
        date: yesterday,
        granularity: "day",
        displayMode: DISPLAY_MODE.FOCUS,
        allowEditingPastNotes: false,
      }),
    ).toBe(true);
  });

  it("過去ノート編集設定がオンなら過去日でも読み取り専用にならない", () => {
    expect(
      isPastDateReadOnly({
        date: yesterday,
        granularity: "day",
        allowEditingPastNotes: true,
      }),
    ).toBe(false);

    settingsStore.setState((state) => ({
      ...state,
      pluginSettings: {
        ...state.pluginSettings!,
        allowEditingPastNotes: true,
      },
      date: yesterday.clone(),
    }));

    expect(settingsStore.getState().isReadOnly()).toBe(false);
    expect(settingsStore.getState().isDateReadOnly(yesterday)).toBe(false);
  });

  it("fixed mode では過去日でも読み取り専用にならない", () => {
    settingsStore.setState({
      date: yesterday.clone(),
      viewNoteMode: "fixed",
      file: "MFDI/fixed.md",
    });

    expect(settingsStore.getState().isReadOnly()).toBe(false);
    expect(settingsStore.getState().isDateReadOnly(yesterday)).toBe(false);
  });

  it("スレッドを開くと対象ノートの日付に同期する", () => {
    settingsStore.getState().setThreadFocusRootId("root-1", yesterday);

    const state = settingsStore.getState();
    expect(state.threadFocusRootId).toBe("root-1");
    expect(state.displayMode).toBe(DISPLAY_MODE.FOCUS);
    expect(state.date.isSame(yesterday, "day")).toBe(true);
  });

  it("home で検索条件も含めて既定状態に戻る", () => {
    settingsStore.setState((state) => ({
      ...state,
      searchQuery: "wanted",
      searchInputOpen: true,
      activeTag: "IT",
      threadFocusRootId: "root-1",
      displayMode: DISPLAY_MODE.FOCUS,
    }));

    settingsStore.getState().handleClickHome();

    const state = settingsStore.getState();
    expect(state.searchQuery).toBe("");
    expect(state.searchInputOpen).toBe(false);
    expect(state.activeTag).toBeNull();
    expect(state.threadFocusRootId).toBeNull();
    expect(state.displayMode).toBe(DISPLAY_MODE.TIMELINE);
    expect(state.mainView).toBe(MAIN_VIEW.TIMELINE);
  });

  it("初期表示モードはタイムライン", () => {
    const initial = createSettingsSlice(
      () => {},
      () => ({}) as any,
      {} as any,
    );
    expect(initial.displayMode).toBe(DISPLAY_MODE.TIMELINE);
    expect(initial.mainView).toBe(MAIN_VIEW.TIMELINE);
  });

  it("メインビュー切替で互換用の表示条件も一括して同期する", () => {
    settingsStore.setState({ searchQuery: "wanted", threadOnly: true });

    settingsStore.getState().setMainView(MAIN_VIEW.SEARCH);
    expect(settingsStore.getState()).toMatchObject({
      mainView: MAIN_VIEW.SEARCH,
      contentView: CONTENT_VIEW.TIMELINE,
      displayMode: DISPLAY_MODE.TIMELINE,
      asTask: false,
      searchInputOpen: true,
    });

    settingsStore.getState().setMainView(MAIN_VIEW.TASKS);
    expect(settingsStore.getState()).toMatchObject({
      mainView: MAIN_VIEW.TASKS,
      contentView: CONTENT_VIEW.TIMELINE,
      displayMode: DISPLAY_MODE.TIMELINE,
      asTask: true,
      searchInputOpen: false,
      searchQuery: "wanted",
      threadOnly: true,
    });

    settingsStore.getState().setMainView(MAIN_VIEW.INSIGHTS);
    expect(settingsStore.getState()).toMatchObject({
      mainView: MAIN_VIEW.INSIGHTS,
      contentView: CONTENT_VIEW.INSIGHTS,
      asTask: false,
    });
  });

  it("左右パネルを個別に開閉し、一括状態も同期する", () => {
    settingsStore.setState({
      sidebarOpen: true,
      leftPanelOpen: true,
      rightPanelOpen: true,
    });

    settingsStore.getState().setLeftPanelOpen(false);
    expect(settingsStore.getState().leftPanelOpen).toBe(false);
    expect(settingsStore.getState().rightPanelOpen).toBe(true);
    expect(settingsStore.getState().sidebarOpen).toBe(true);

    settingsStore.getState().setRightPanelOpen(false);
    expect(settingsStore.getState().leftPanelOpen).toBe(false);
    expect(settingsStore.getState().rightPanelOpen).toBe(false);
    expect(settingsStore.getState().sidebarOpen).toBe(false);

    settingsStore.getState().setSidebarOpen(true);
    expect(settingsStore.getState().leftPanelOpen).toBe(true);
    expect(settingsStore.getState().rightPanelOpen).toBe(true);
  });

  it("パネルのtoggle actionが個別状態と一括状態を維持する", () => {
    settingsStore.setState({
      sidebarOpen: false,
      leftPanelOpen: false,
      rightPanelOpen: false,
    });

    settingsStore.getState().toggleLeftPanel();
    expect(settingsStore.getState().leftPanelOpen).toBe(true);
    expect(settingsStore.getState().sidebarOpen).toBe(true);

    settingsStore.getState().toggleRightPanel();
    expect(settingsStore.getState().rightPanelOpen).toBe(true);
    expect(settingsStore.getState().sidebarOpen).toBe(true);

    settingsStore.getState().toggleSidebar();
    expect(settingsStore.getState().sidebarOpen).toBe(false);
    expect(settingsStore.getState().leftPanelOpen).toBe(false);
    expect(settingsStore.getState().rightPanelOpen).toBe(false);
  });
});
