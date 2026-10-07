import type { MFDIStore } from "src/features/workspace/store/slices/types";
import type { TasksSlice } from "src/features/tasks/store/types";
import type { StateCreator } from "zustand/vanilla";

export const createTasksSlice: StateCreator<MFDIStore, [], [], TasksSlice> = (set, get) => ({
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
