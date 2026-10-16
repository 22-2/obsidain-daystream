import { appStore, useRequiredAppStore } from "src/features/workspace/store/appStore";
import type { DaystreamStore } from "src/features/workspace/store/slices/types";
import type { NoteSlice } from "src/features/notes/store/types";
import { useStore } from "zustand";

export const noteStore = appStore;

export function useNoteStore<T>(selector: (state: NoteSlice & DaystreamStore) => T): T {
  const store = useRequiredAppStore();
  return useStore(store, selector as (state: DaystreamStore) => T);
}
