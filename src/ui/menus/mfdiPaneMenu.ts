import type { Menu } from "obsidian";
import { addPeriodMenuItems } from "src/ui/menus/periodMenu";
import type { MFDIActionDelegate } from "src/ui/view/MFDIViewHandler";
import type { MFDIViewState } from "src/ui/view/state";
import { getMFDIViewCapabilities } from "src/ui/view/state";

export interface MFDIPaneMenuOptions {
  getState: () => MFDIViewState;
  actionDelegates: MFDIActionDelegate;
  onDeleteFixedNote: () => Promise<void>;
}

/** Builds the pane menu for an MFDI view without coupling the menu to ItemView. */
export function addMFDIPaneMenuItems(menu: Menu, options: MFDIPaneMenuOptions): void {
  const state = options.getState();

  addFixedNoteMenuItems(menu, state, options.actionDelegates);
  addViewMenuItems(menu, options);
  addPeriodMenuItemsIfSupported(menu, state, options.actionDelegates);
  addDeleteFixedNoteMenuItem(menu, state, options.onDeleteFixedNote);
}

function addFixedNoteMenuItems(
  menu: Menu,
  state: MFDIViewState,
  actionDelegates: MFDIActionDelegate,
): void {
  if (state.displayMode === "timeline") return;

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

  menu.addItem((item) =>
    item
      .setTitle("すべてのメッセージをコピー")
      .setIcon("copy")
      .onClick(() => options.actionDelegates.onCopyAllPosts?.()),
  );

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

function addDeleteFixedNoteMenuItem(
  menu: Menu,
  state: MFDIViewState,
  onDeleteFixedNote: () => Promise<void>,
): void {
  if (state.noteMode !== "fixed") return;

  menu.addSeparator();
  menu.addItem((item) =>
    item
      .setTitle("削除")
      .setIcon("trash")
      .setWarning(true)
      .onClick(() => onDeleteFixedNote()),
  );
}
