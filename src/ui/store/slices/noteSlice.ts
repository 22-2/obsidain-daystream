import { Notice } from "obsidian";
import { resolveNoteSource } from "src/core/note-source";
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
      granularity,
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
      granularity,
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
      granularity,
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

      // 明示的にMarkdownビューとして開きたい場合はフラグを付与して
      // プラグイン側の setViewState パッチでの置換を回避する。
      const leaf = shell.getLeaf(true);
      await leaf.setViewState({
        type: "markdown",
        active: true,
        state: { file: note.path, __mfdi_force_markdown: true },
      });
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
