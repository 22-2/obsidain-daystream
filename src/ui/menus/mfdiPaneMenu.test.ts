import type { Menu } from "obsidian";
import type { MFDIActionDelegate } from "src/ui/view/MFDIViewHandler";
import type { MFDIViewState } from "src/ui/view/state";
import { addMFDIPaneMenuItems } from "src/ui/menus/mfdiPaneMenu";
import { describe, expect, it, vi } from "vitest";

class TestMenuItem {
  title = "";
  callback: (() => void) | undefined;

  setTitle(title: string): this {
    this.title = title;
    return this;
  }

  setIcon(): this {
    return this;
  }

  setDisabled(): this {
    return this;
  }

  setChecked(): this {
    return this;
  }

  setWarning(): this {
    return this;
  }

  onClick(callback: () => void): this {
    this.callback = callback;
    return this;
  }
}

class TestMenu {
  readonly items: Array<TestMenuItem | "separator"> = [];

  addSeparator(): this {
    this.items.push("separator");
    return this;
  }

  addItem(build: (item: TestMenuItem) => unknown): this {
    const item = new TestMenuItem();
    build(item);
    this.items.push(item);
    return this;
  }
}

const baseState: MFDIViewState = {
  displayMode: "focus",
  granularity: "day",
  asTask: false,
  threadOnly: false,
  fixedSessionNumber: 1,
  timeFilter: "all",
  dateFilter: "all",
  searchQuery: "",
  activeTopic: "",
  noteMode: "periodic",
  file: null,
};

function getTitles(menu: TestMenu): string[] {
  return menu.items
    .filter((item): item is TestMenuItem => item !== "separator")
    .map((item) => item.title);
}

describe("addMFDIPaneMenuItems", () => {
  it("adds periodic-view actions and invokes current-state callbacks", () => {
    const state = { ...baseState };
    const onChangeDisplayMode = vi.fn();
    const onChangeAsTask = vi.fn();
    const menu = new TestMenu();

    addMFDIPaneMenuItems(menu as unknown as Menu, {
      getState: () => state,
      actionDelegates: { onChangeDisplayMode, onChangeAsTask } as MFDIActionDelegate,
      onDeleteFixedNote: vi.fn(async () => undefined),
    });

    expect(getTitles(menu)).toEqual(
      expect.arrayContaining([
        "現在のノートを開く",
        "すべてのメッセージをコピー",
        "下書きを管理",
        "フォーカスモード",
        "メッセージモード",
      ]),
    );
    expect(getTitles(menu)).not.toContain("削除");

    const displayModeItem = menu.items.find(
      (item): item is TestMenuItem => item !== "separator" && item.title === "フォーカスモード",
    );
    displayModeItem?.callback?.();
    expect(onChangeDisplayMode).toHaveBeenCalledWith("timeline");

    state.asTask = true;
    const taskItem = menu.items.find(
      (item): item is TestMenuItem => item !== "separator" && item.title === "メッセージモード",
    );
    taskItem?.callback?.();
    expect(onChangeAsTask).toHaveBeenCalledWith(false);
  });

  it("shows fixed-note deletion and omits periodic display-mode switching", async () => {
    const onDeleteFixedNote = vi.fn(async () => undefined);
    const menu = new TestMenu();

    addMFDIPaneMenuItems(menu as unknown as Menu, {
      getState: () => ({ ...baseState, noteMode: "fixed" }),
      actionDelegates: {},
      onDeleteFixedNote,
    });

    expect(getTitles(menu)).toContain("削除");
    expect(getTitles(menu)).not.toContain("フォーカスモード");

    const deleteItem = menu.items.find(
      (item): item is TestMenuItem => item !== "separator" && item.title === "削除",
    );
    await deleteItem?.callback?.();
    expect(onDeleteFixedNote).toHaveBeenCalledOnce();
  });
});
