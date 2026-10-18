import { STORAGE_KEYS } from "src/features/workspace/config/constants";
import type { DSTRStore } from "src/features/workspace/store/slices/types";
import type { Draft, DraftSlice } from "src/features/composer/store/types";
import type { StateCreator } from "zustand";

export const createDraftSlice: StateCreator<DSTRStore, [], [], DraftSlice> = (set, get) => ({
  drafts: [],
  addDraft: (content: string) => {
    if (!content.trim()) return;
    const newDraft: Draft = {
      id: Date.now().toString(),
      content,
      createdAt: Date.now(),
    };
    const nextDrafts = [newDraft, ...get().drafts];
    set({ drafts: nextDrafts });
    get().storage?.set(STORAGE_KEYS.DRAFTS, nextDrafts);
  },
  removeDraft: (id: string) => {
    const nextDrafts = get().drafts.filter((d) => d.id !== id);
    set({ drafts: nextDrafts });
    get().storage?.set(STORAGE_KEYS.DRAFTS, nextDrafts);
  },
  clearDrafts: () => {
    set({ drafts: [] });
    get().storage?.set(STORAGE_KEYS.DRAFTS, []);
  },
  hydrateDraftState: () => {
    const storage = get().storage;
    if (storage) {
      const drafts = storage.get<Draft[]>(STORAGE_KEYS.DRAFTS, []);
      set({ drafts });
    }
  },
});
