import type { MFDIStore, PostsSlice } from "src/ui/store/slices/types";
import type { StateCreator } from "zustand/vanilla";

export const createPostsSlice: StateCreator<MFDIStore, [], [], PostsSlice> = (set, get) => ({
  tasks: [],

  setTasks: (tasks) => {
    set({ tasks });
  },

  updateTasks: async (note) => {
    const { shell } = get();
    if (!shell) return;
    set({ tasks: (await shell.getTasks(note)) ?? [] });
  },
});
