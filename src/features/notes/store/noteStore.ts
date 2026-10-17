import { appStore, useRequiredAppStore } from "src/features/workspace/store/appStore";
import type { DSTRStore } from "src/features/workspace/store/slices/types";
import type { NoteSlice } from "src/features/notes/store/types";
import { useStore } from "zustand";

export const noteStore = appStore;

export function useNoteStore<T>(selector: (state: NoteSlice & DSTRStore) => T): T {
  const store = useRequiredAppStore();
  return useStore(store, selector);
}
