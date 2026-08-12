import { Notice } from "obsidian";
import { INPUT_AREA_SIZE, STORAGE_KEYS } from "src/ui/config/consntants";
import { getInputAreaSizeStorageKey } from "src/ui/store/slices/inputStorage";
import { DEFAULT_LAYOUT_STATE } from "src/ui/store/slices/settingsDefaults";
import { persistValue } from "src/ui/store/slices/settingsPersistence";
import type { LayoutSlice, MFDIStore } from "src/ui/store/slices/types";
import type { InputAreaSize } from "src/ui/types";
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
    const { storage, viewNoteMode, file, granularity, date } = get();
    storage?.set(
      getInputAreaSizeStorageKey(viewNoteMode, file, granularity, date.format("YYYY-MM-DD")),
      size,
    );
  },

  reloadInputAreaSize: () => {
    const { storage, viewNoteMode, file, granularity, date } = get();
    if (!storage) return;
    const size = storage.get<InputAreaSize>(
      getInputAreaSizeStorageKey(viewNoteMode, file, granularity, date.format("YYYY-MM-DD")),
      INPUT_AREA_SIZE.DEFAULT,
    );
    set({ inputAreaSize: size });
  },

  setSidebarOpen: (sidebarOpen) => {
    set({
      sidebarOpen,
      leftPanelOpen: sidebarOpen,
      rightPanelOpen: sidebarOpen,
    });
    const state = get();
    persistValue(state, STORAGE_KEYS.SIDEBAR_OPEN, sidebarOpen);
    persistValue(state, STORAGE_KEYS.PANEL_LEFT_OPEN, sidebarOpen);
    persistValue(state, STORAGE_KEYS.PANEL_RIGHT_OPEN, sidebarOpen);
  },

  setLeftPanelOpen: (leftPanelOpen) => {
    const sidebarOpen = leftPanelOpen || get().rightPanelOpen;
    set({ leftPanelOpen, sidebarOpen });
    const state = get();
    persistValue(state, STORAGE_KEYS.PANEL_LEFT_OPEN, leftPanelOpen);
    persistValue(state, STORAGE_KEYS.SIDEBAR_OPEN, sidebarOpen);
  },

  setRightPanelOpen: (rightPanelOpen) => {
    const sidebarOpen = get().leftPanelOpen || rightPanelOpen;
    set({ rightPanelOpen, sidebarOpen });
    const state = get();
    persistValue(state, STORAGE_KEYS.PANEL_RIGHT_OPEN, rightPanelOpen);
    persistValue(state, STORAGE_KEYS.SIDEBAR_OPEN, sidebarOpen);
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
