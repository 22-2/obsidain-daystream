import { resolveWriteGranularity } from "src/ui/utils/write-context";
import { Notice } from "obsidian";
import { resolveNoteSource } from "src/core/note-source";
import { openMarkdownNote } from "src/ui/utils/open-markdown-note";
import type { MFDIStore, NoteSlice } from "src/ui/store/slices/types";
import type { StateCreator } from "zustand/vanilla";

export const createNoteSlice: StateCreator<MFDIStore, [], [], NoteSlice> = (set, get) => ({
  currentDailyNote: null,
  weekNotePaths: new Set(),

  setCurrentDailyNote: (currentDailyNote) => {
    set({ currentDailyNote });
  },

  updateCurrentDailyNote: (shell) => {
    const {
      granularity,
      activeTopic,
      getEffectiveDate,
      currentDailyNote,
      viewNoteMode,
      file,
    } = get();
    const noteSource = resolveNoteSource({
      shell,
      date: getEffectiveDate(),
      // 意図: タイムラインの参照先を投稿先の日次ノートと一致させる。
      granularity: resolveWriteGranularity(get().displayMode, granularity),
      activeTopic,
      noteMode: viewNoteMode,
      file: file,
    });
    const note = noteSource.resolveCurrentNote();
    if (note?.path !== currentDailyNote?.path) {
      set({ currentDailyNote: note });
    }
  },

  replacePaths: (weekNotePaths) => {
    set({ weekNotePaths });
  },

  addPaths: (paths) => {
    set((state) => {
      const next = new Set(state.weekNotePaths);
      paths.forEach((path) => next.add(path));
      return { weekNotePaths: next };
    });
  },

  clearPaths: () => {
    set({ weekNotePaths: new Set() });
  },

  createNoteWithInsertAfter: async (shell, settings, targetDate, options) => {
    const { granularity, activeTopic, getEffectiveDate, viewNoteMode, file } = get();
    const date = targetDate ?? getEffectiveDate();
    const noteSource = resolveNoteSource({
      shell,
      date,
      // 意図: 日付ビューの粒度が残っていても、タイムラインの投稿先は必ず日次にする。
      granularity: resolveWriteGranularity(get().displayMode, granularity),
      activeTopic,
      noteMode: viewNoteMode,
      file: file,
    });
    const note = noteSource.resolveCurrentNote() ?? (await noteSource.ensureCurrentNote());
    if (!note) return null;

    // 意図: 投稿(submit)経路では直後の insertTextAfterEnsuringMarker が
    // マーカー保証込みで 1 write するため、ここで別 write を挟むと
    // vault イベントが余計に発火してタイムラインがガクつく。スキップ可能にする。
    if (
      noteSource.mode === "periodic" &&
      settings.insertAfter &&
      (options?.ensureInsertAfter ?? true)
    ) {
      const content = await shell.readVaultFile(note);
      if (!content.includes(settings.insertAfter)) {
        await shell.modifyVaultFile(
          note,
          content ? `${content}\n${settings.insertAfter}` : settings.insertAfter,
        );
      }
    }

    set({ currentDailyNote: note });
    return note;
  },

  handleClickOpenDailyNote: async (shell, settings) => {
    const { getEffectiveDate } = get();
    await get().openDailyNoteForDate(shell, settings, getEffectiveDate());
  },

  openDailyNoteForDate: async (shell, settings, targetDate) => {
    const { granularity, activeTopic, viewNoteMode, file } = get();
    const noteSource = resolveNoteSource({
      shell,
      date: targetDate,
      // 意図: ソースを開く操作も、タイムラインの投稿先と同じ日次ノートを使う。
      granularity: resolveWriteGranularity(get().displayMode, granularity),
      activeTopic,
      noteMode: viewNoteMode,
      file: file,
    });
    let note = noteSource.resolveCurrentNote();

    if (!note) {
      new Notice("ノートが存在しなかったので新しく作成しました");
      note = await get().createNoteWithInsertAfter(shell, settings, targetDate);
    }

    if (note) {
      set({ currentDailyNote: note });

      const leaf = shell.getLeaf(true);
      await openMarkdownNote(leaf, note.path);
    }
  },

  handleChangeTopic: (topicId) => {
    const { activeTopic, setActiveTopic, setTasks } = get();
    if (activeTopic === topicId) return;
    setActiveTopic(topicId);
    set({ currentDailyNote: null });
    setTasks([]);
  },
});
