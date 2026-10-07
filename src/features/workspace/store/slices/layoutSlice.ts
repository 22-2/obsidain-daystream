import { Notice } from "obsidian";
import { INPUT_AREA_SIZE } from "src/features/workspace/config/constants";
import { DEFAULT_LAYOUT_STATE } from "src/features/workspace/store/slices/settingsDefaults";
import {
  persistInputAreaSize,
  persistLayoutState,
  restoreInputAreaSize,
} from "src/features/workspace/store/slices/settingsPersistence";
import type { LayoutSlice, MFDIStore } from "src/features/workspace/store/slices/types";
import type { StateCreator } from "zustand/vanilla";

export const createLayoutSlice: StateCreator<MFDIStore, [], [], LayoutSlice> = (set, get) => ({
  ...DEFAULT_LAYOUT_STATE,

  setInputAreaSize: (size) => {
    // 入力内容がある状態で最小化するのを防止
    if (size === INPUT_AREA_SIZE.MINIMIZED && get().getInputValue().trim().length > 0) {
      new Notice("編集中は最小化できません");
      return;
    }

    set({ inputAreaSize: size });
    persistInputAreaSize(get(), size);
  },

  reloadInputAreaSize: () => {
    const state = get();
    if (!state.storage) return;
    // 意図: 日付の自動更新などで保存済みサイズを読み直しても、
    // 執筆中・投稿編集中の最大化を解除して作業領域を縮めない。
    if (
      state.inputAreaSize === INPUT_AREA_SIZE.MAXIMIZED &&
      (state.getInputValue().length > 0 || state.editingPost !== null)
    ) {
      return;
    }
    set({ inputAreaSize: restoreInputAreaSize(state) });
  },

  setSidebarOpen: (sidebarOpen) => {
    set({
      sidebarOpen,
      leftPanelOpen: sidebarOpen,
      rightPanelOpen: sidebarOpen,
    });
    persistLayoutState(get(), {
      sidebarOpen,
      leftPanelOpen: sidebarOpen,
      rightPanelOpen: sidebarOpen,
    });
  },

  setLeftPanelOpen: (leftPanelOpen) => {
    const sidebarOpen = leftPanelOpen || get().rightPanelOpen;
    set({ leftPanelOpen, sidebarOpen });
    persistLayoutState(get(), { leftPanelOpen, sidebarOpen });
  },

  setRightPanelOpen: (rightPanelOpen) => {
    const sidebarOpen = get().leftPanelOpen || rightPanelOpen;
    set({ rightPanelOpen, sidebarOpen });
    persistLayoutState(get(), { rightPanelOpen, sidebarOpen });
  },

  toggleSidebar: () => {
    const state = get();
    state.setSidebarOpen(!state.sidebarOpen);
  },

  toggleLeftPanel: () => {
    const state = get();
    state.setLeftPanelOpen(!state.leftPanelOpen);
  },

  toggleRightPanel: () => {
    const state = get();
    state.setRightPanelOpen(!state.rightPanelOpen);
  },

  setSearchQuery: (searchQuery) => {
    set({ searchQuery });
  },

  setSearchInputOpen: (searchInputOpen) => {
    set({ searchInputOpen });
  },
});
