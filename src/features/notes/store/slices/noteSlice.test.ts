import { resolveNoteSource } from "src/core/note-source";
import { DEFAULT_SETTINGS } from "src/core/domain/settings";
import { createAppStore } from "src/features/workspace/store/appStore";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("src/core/note-source", () => ({ resolveNoteSource: vi.fn() }));

afterEach(() => vi.restoreAllMocks());

describe("タイムラインの投稿先ノート", () => {
  it("月粒度が残っていても今日の日次ノートを参照・作成する", async () => {
    const note = { path: "Daily/today.md" };
    const ensureCurrentNote = vi.fn(async () => note);
    vi.mocked(resolveNoteSource).mockReturnValue({
      mode: "periodic",
      resolveCurrentNote: () => null,
      ensureCurrentNote,
    } as never);
    const store = createAppStore();
    store.setState({ granularity: "month", date: window.moment("2026-02-01") });
    const shell = {} as never;

    store.getState().updateCurrentDailyNote(shell);
    await store
      .getState()
      .createNoteWithInsertAfter(shell, DEFAULT_SETTINGS, undefined, {
        ensureInsertAfter: false,
      });

    expect(ensureCurrentNote).toHaveBeenCalledOnce();
    expect(resolveNoteSource).toHaveBeenCalledTimes(2);
    for (const [params] of vi.mocked(resolveNoteSource).mock.calls) {
      expect(params.granularity).toBe("day");
      expect(params.date.isSame(window.moment(), "day")).toBe(true);
    }
    expect(store.getState().currentDailyNote).toBe(note);
  });
});
