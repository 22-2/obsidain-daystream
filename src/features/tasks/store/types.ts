import type { TFile } from "obsidian";
import type { Task } from "src/core/task-text";

/** 意図: タスク一覧状態を所有するtasks Storeの契約を機能側に置く。 */
export interface TasksSlice {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  updateTasks: (note: TFile) => Promise<void>;
}
