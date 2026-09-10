import { TFile } from "obsidian";
import type { BuiltinMainContext } from "src/core/builtin-registry";
import { activateBuiltins } from "src/core/builtin-registry";
import { describe, expect, it, vi } from "vitest";

const VIEW_TYPE_MFDI = "mfdi-view";

// 意図: server.deps.inline で @22-2/obsidian-magical-editor が Vite 経由で処理されると
// obsidian モックの全エクスポートが解決される必要がある。importOriginal でグローバルモックを
// スプレッドし、このテスト固有の差し替えだけ上書きする。
vi.mock("obsidian", async (importOriginal) => {
  const actual = await importOriginal<typeof import("obsidian")>();
  return {
    ...actual,
    TFile: class MockTFile {
      path = "";
      basename = "";
      extension = "";
    },
    WorkspaceLeaf: class MockWorkspaceLeaf {},
  };
});

const mocks = vi.hoisted(() => {
  return {
    around: vi.fn(() => () => {}),
    createTagIndexExtension: vi.fn(),
    createFixedNoteViewExtension: vi.fn(),
    storageGet: vi.fn(),
    storageSet: vi.fn(),
    tagIndexExtension: {
      fullScan: vi.fn(async () => {}),
      handleFileChanged: vi.fn(async () => {}),
      handleFileRenamed: vi.fn(async () => {}),
      handleFileDeleted: vi.fn(async () => {}),
      dispose: vi.fn(async () => {}),
    },
    fixedNoteViewExtension: {
      convertMarkdownViewState: vi.fn((viewState: unknown) => viewState),
      replaceOpenFixedMarkdownLeaves: vi.fn(async () => {}),
    },
  };
});

vi.mock("monkey-around", () => ({
  around: mocks.around,
}));

vi.mock("src/extensions/tag-index-extension", () => ({
  createTagIndexExtension: mocks.createTagIndexExtension,
}));

vi.mock("src/extensions/fixed-note-view-extension", () => ({
  createFixedNoteViewExtension: mocks.createFixedNoteViewExtension,
}));

vi.mock("src/core/storage", () => ({
  MFDIStorage: class {
    get = mocks.storageGet;
    set = mocks.storageSet;
  },
}));

describe("builtin registry", () => {
  it("activates built-ins and wires view, command, tag-index, and fixed-note lifecycles", async () => {
    vi.clearAllMocks();
    mocks.createTagIndexExtension.mockReturnValue(mocks.tagIndexExtension);
    mocks.createFixedNoteViewExtension.mockReturnValue(mocks.fixedNoteViewExtension);
    mocks.storageGet.mockReturnValue(null);

    const layoutReadyCallbacks: Array<() => void | Promise<void>> = [];
    const vaultHandlers = new Map<string, Array<(...args: unknown[]) => void>>();
    const metadataCacheHandlers = new Map<string, Array<(...args: unknown[]) => void>>();

    const revealLeaf = vi.fn();
    const getLeavesOfType = vi.fn(() => []);
    const registerEvent = vi.fn();
    const register = vi.fn();
    const registerView = vi.fn();
    const addRibbonIcon = vi.fn();
    const addCommand = vi.fn((command) => command);
    const getMFDISubmitCallback = vi.fn(() => undefined);
    const getMFDIInputSnapshot = vi.fn(() => "");
    const createMFDIView = vi.fn((leaf) => ({ leaf }));
    const createDayOneView = vi.fn((leaf) => ({ leaf }));
    const createMFDIEditorView = vi.fn((leaf) => ({ leaf }));
    const createAndOpenFixedNote = vi.fn(async () => {});
    const attachMFDIView = vi.fn(async () => ({ id: "leaf" }));
    const attachDayOneView = vi.fn(async () => ({ id: "dayone-leaf" }));
    const saveSettings = vi.fn(async () => {});

    const settings = {
      files: [{ path: "old.md" }, { path: "keep.md" }],
      fullScanIntervalHours: 24,
    } as unknown as ReturnType<BuiltinMainContext["getSettings"]>;

    const app = {
      workspace: {
        revealLeaf,
        getLeavesOfType,
        onLayoutReady: (callback: () => void | Promise<void>) => {
          layoutReadyCallbacks.push(callback);
        },
      },
      metadataCache: {
        on: (event: string, callback: (...args: unknown[]) => void) => {
          metadataCacheHandlers.set(event, [...(metadataCacheHandlers.get(event) ?? []), callback]);
          return {};
        },
      },
      vault: {
        on: (event: string, callback: (...args: unknown[]) => void) => {
          vaultHandlers.set(event, [...(vaultHandlers.get(event) ?? []), callback]);
          return {};
        },
      },
    };

    const context = {
      app: app as unknown as BuiltinMainContext["app"],
      shell: {} as BuiltinMainContext["shell"],
      getSettings: () => settings,
      saveSettings,
      register,
      registerEvent,
      registerView,
      addRibbonIcon,
      addCommand,
      getMFDISubmitCallback,
      getMFDIInputSnapshot,
      createMFDIView,
      createDayOneView,
      createMFDIEditorView,
      createAndOpenFixedNote,
      attachMFDIView,
      attachDayOneView,
    } as unknown as BuiltinMainContext;

    activateBuiltins(context, "app-1");

    // MFDI / Day One-inspired / editor の3つが登録される
    expect(registerView).toHaveBeenCalledTimes(3);
    const [viewType, viewCreator] = registerView.mock.calls[0] as [
      string,
      (leaf: unknown) => unknown,
    ];
    expect(viewType).toBe(VIEW_TYPE_MFDI);
    expect(viewCreator({ id: "leaf-1" })).toEqual({ leaf: { id: "leaf-1" } });

    const [dayOneViewType, dayOneViewCreator] = registerView.mock.calls[1] as [
      string,
      (leaf: unknown) => unknown,
    ];
    expect(dayOneViewType).toBe("dayone-view");
    expect(dayOneViewCreator({ id: "leaf-2" })).toEqual({
      leaf: { id: "leaf-2" },
    });

    const [editorViewType, editorViewCreator] = registerView.mock.calls[2] as [
      string,
      (leaf: unknown) => unknown,
    ];
    expect(editorViewType).toBe("mfdi-editor-view");
    expect(editorViewCreator({ id: "leaf-2" })).toEqual({
      leaf: { id: "leaf-2" },
    });

    expect(addRibbonIcon).toHaveBeenCalledWith(
      "pencil",
      "Mobile First Daily Interface",
      expect.any(Function),
    );
    expect(addCommand).toHaveBeenCalledTimes(4);

    const ribbonCallback = addRibbonIcon.mock.calls[0]?.[2] as () => void;
    ribbonCallback();
    expect(attachMFDIView).toHaveBeenCalledWith({});

    const openViewCommand = addCommand.mock.calls[0]?.[0] as {
      callback: () => Promise<void>;
    };
    await openViewCommand.callback();
    expect(revealLeaf).toHaveBeenCalledWith({ id: "leaf" });

    const fixedNoteCommand = addCommand.mock.calls[1]?.[0] as {
      callback: () => Promise<void>;
    };
    await fixedNoteCommand.callback();
    expect(createAndOpenFixedNote).toHaveBeenCalledTimes(1);

    const dayOneCommand = addCommand.mock.calls[2]?.[0] as {
      callback: () => Promise<void>;
    };
    await dayOneCommand.callback();
    expect(attachDayOneView).toHaveBeenCalledTimes(1);

    expect(register).toHaveBeenCalledTimes(2);
    expect(registerEvent).toHaveBeenCalledTimes(7);
    expect(mocks.createTagIndexExtension).toHaveBeenCalledWith("app-1");
    expect(mocks.createFixedNoteViewExtension).toHaveBeenCalledTimes(1);
    expect(getLeavesOfType).toHaveBeenCalledWith("markdown");

    const layoutReadyCallback = layoutReadyCallbacks[0];
    expect(layoutReadyCallback).toBeDefined();
    await layoutReadyCallback?.();
    expect(mocks.tagIndexExtension.fullScan).toHaveBeenCalledWith(context.shell, settings);
    expect(mocks.storageSet).toHaveBeenCalledWith("lastFullScanAt", expect.any(String));

    const file = Object.assign(new TFile(), {
      path: "new.md",
      basename: "new",
      extension: "md",
    });

    for (const handler of vaultHandlers.get("create") ?? []) {
      handler(file);
    }
    for (const handler of vaultHandlers.get("modify") ?? []) {
      handler(file);
    }
    for (const handler of metadataCacheHandlers.get("changed") ?? []) {
      handler(file);
    }
    for (const handler of vaultHandlers.get("rename") ?? []) {
      handler(file, "old.md");
    }
    for (const handler of vaultHandlers.get("delete") ?? []) {
      handler(file);
    }

    expect(mocks.tagIndexExtension.handleFileChanged).toHaveBeenCalledWith(
      context.shell,
      file,
      settings,
    );
    expect(mocks.tagIndexExtension.handleFileRenamed).toHaveBeenCalledWith(
      context.shell,
      file,
      "old.md",
      settings,
    );
    expect(mocks.tagIndexExtension.handleFileDeleted).toHaveBeenCalledWith(file.path);

    expect(settings.files).toEqual([{ path: "keep.md" }]);
    expect(saveSettings).toHaveBeenCalledTimes(2);
  });
});
