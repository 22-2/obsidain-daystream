import type { Menu } from "obsidian";
import type { DSTRActionDelegate } from "src/features/workspace/views/DSTRViewHandler";
import type { DSTRViewState } from "src/features/workspace/views/state";
import { addDSTRPaneMenuItems } from "src/features/workspace/menus/dstrPaneMenu";
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

const baseState: DSTRViewState = {
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

describe("addDSTRPaneMenuItems", () => {
  it("adds periodic-view actions and invokes current-state callbacks", () => {
    const state = { ...baseState };
    const onChangeDisplayMode = vi.fn();
    const onChangeAsTask = vi.fn();
    const menu = new TestMenu();

    addDSTRPaneMenuItems(menu as unknown as Menu, {
      getState: () => state,
      actionDelegates: { onChangeDisplayMode, onChangeAsTask } as DSTRActionDelegate,
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

  it("keeps only fixed-note actions and omits view controls", () => {
    const menu = new TestMenu();

    addDSTRPaneMenuItems(menu as unknown as Menu, {
      getState: () => ({ ...baseState, noteMode: "fixed" }),
      actionDelegates: {},
    });

    expect(getTitles(menu)).toEqual(["現在のノートを開く", "すべてのメッセージをコピー"]);
    expect(getTitles(menu)).not.toContain("フォーカスモード");
    expect(getTitles(menu)).not.toContain("削除");
  });
});
