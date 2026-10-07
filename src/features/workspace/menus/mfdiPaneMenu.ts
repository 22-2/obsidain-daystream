import type { Menu } from "obsidian";
import { addPeriodMenuItems } from "src/features/workspace/menus/periodMenu";
import type { MFDIActionDelegate } from "src/features/workspace/views/MFDIViewHandler";
import type { MFDIViewState } from "src/features/workspace/views/state";
import { getMFDIViewCapabilities } from "src/features/workspace/views/state";

export interface MFDIPaneMenuOptions {
  getState: () => MFDIViewState;
  actionDelegates: MFDIActionDelegate;
}

/** Builds the pane menu for an MFDI view without coupling the menu to ItemView. */
export function addMFDIPaneMenuItems(menu: Menu, options: MFDIPaneMenuOptions): void {
  const state = options.getState();

  if (state.noteMode === "fixed") {
    // 意図: fixedノートではノート固有の操作だけを残し、表示切替や期間操作が
    // 固定ノートのペインメニューへ混ざらないようにする。
    addFixedNoteMenuItems(menu, state, options.actionDelegates);
    addCopyAllMessagesMenuItem(menu, options.actionDelegates);
    return;
  }

  addFixedNoteMenuItems(menu, state, options.actionDelegates);
  addViewMenuItems(menu, options);
  addPeriodMenuItemsIfSupported(menu, state, options.actionDelegates);
}

function addFixedNoteMenuItems(
  menu: Menu,
  state: MFDIViewState,
  actionDelegates: MFDIActionDelegate,
): void {
  if (state.noteMode !== "fixed" && state.displayMode === "timeline") return;

  menu.addItem((item) =>
    item
      .setTitle("現在のノートを開く")
      .setIcon("external-link")
      .onClick(() => actionDelegates.onOpenDailyNoteAction?.()),
  );
}

function addViewMenuItems(menu: Menu, options: MFDIPaneMenuOptions): void {
  const state = options.getState();
  const capabilities = getMFDIViewCapabilities(state);

  addCopyAllMessagesMenuItem(menu, options.actionDelegates);

  menu.addSeparator();
  menu.addItem((item) => item.setTitle("ビュー").setIcon("panels-top-left").setDisabled(true));

  menu.addItem((item) =>
    item
      .setTitle("下書きを管理")
      .setIcon("library")
      .onClick(() => options.actionDelegates.onOpenDraftList?.()),
  );

  if (capabilities.supportsDisplayModeSwitch) {
    const isFocus = state.displayMode === "focus";
    menu.addItem((item) =>
      item
        .setTitle(isFocus ? "フォーカスモード" : "タイムラインモード")
        .setIcon(isFocus ? "toggle-left" : "toggle-right")
        .onClick(() =>
          options.actionDelegates.onChangeDisplayMode?.(isFocus ? "timeline" : "focus"),
        ),
    );
  }

  menu.addItem((item) =>
    item
      .setTitle(state.asTask ? "タスクモード" : "メッセージモード")
      .setIcon(state.asTask ? "toggle-left" : "toggle-right")
      .onClick(() => options.actionDelegates.onChangeAsTask?.(!options.getState().asTask)),
  );
}

function addCopyAllMessagesMenuItem(menu: Menu, actionDelegates: MFDIActionDelegate): void {
  menu.addItem((item) =>
    item
      .setTitle("すべてのメッセージをコピー")
      .setIcon("copy")
      .onClick(() => actionDelegates.onCopyAllPosts?.()),
  );
}

function addPeriodMenuItemsIfSupported(
  menu: Menu,
  state: MFDIViewState,
  actionDelegates: MFDIActionDelegate,
): void {
  const capabilities = getMFDIViewCapabilities(state);
  if (!capabilities.supportsPeriodMenus) return;
  if (state.displayMode !== "focus") return;

  addPeriodMenuItems(menu, state, {
    onChangeTimeFilter: (filter) => actionDelegates.onChangeTimeFilter?.(filter),
    onChangeDateFilter: (filter) => actionDelegates.onChangeDateFilter?.(filter),
  });
}
