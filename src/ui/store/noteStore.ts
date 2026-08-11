import { appStore, useCurrentAppStore } from "src/ui/store/appStore";
import type { MFDIStore, NoteSlice } from "src/ui/store/slices/types";
import { useStore } from "zustand";

export const noteStore = appStore;

export function useNoteStore<T>(selector: (state: NoteSlice & MFDIStore) => T): T {
  const store = useCurrentAppStore();
  return useStore(store, selector as (state: MFDIStore) => T);
}
