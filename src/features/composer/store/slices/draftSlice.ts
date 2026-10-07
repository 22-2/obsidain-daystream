import type { MFDIStore } from "src/features/workspace/store/slices/types";
import type { Draft, DraftSlice } from "src/features/composer/store/types";
import type { StateCreator } from "zustand";

export const createDraftSlice: StateCreator<MFDIStore, [], [], DraftSlice> = (set, get) => ({
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
    get().storage?.set("drafts", nextDrafts);
  },
  removeDraft: (id: string) => {
    const nextDrafts = get().drafts.filter((d) => d.id !== id);
    set({ drafts: nextDrafts });
    get().storage?.set("drafts", nextDrafts);
  },
  clearDrafts: () => {
    set({ drafts: [] });
    get().storage?.set("drafts", []);
  },
  hydrateDraftState: () => {
    const storage = get().storage;
    if (storage) {
      const drafts = storage.get<Draft[]>("drafts", []);
      set({ drafts });
    }
  },
});
