import type { WorkspaceLeaf } from "obsidian";
import { forgetDeletedFixedNote } from "src/features/notes/utils/forget-deleted-fixed-note";
import { describe, expect, it, vi } from "vitest";

const DELETED = "dstr/Target.dstr.md";

function entry(type: string, file: string) {
  return { state: { type, state: { file } }, eState: {} };
}

function createLeaf(params: {
  current: { type: string; state?: Record<string, unknown> };
  backHistory?: unknown[];
  forwardHistory?: unknown[];
  withoutHistory?: boolean;
}) {
  const leaf = {
    getViewState: vi.fn(() => params.current),
    setViewState: vi.fn(async () => {}),
    history: params.withoutHistory
      ? undefined
      : { backHistory: params.backHistory ?? [], forwardHistory: params.forwardHistory ?? [] },
  };
  return leaf as unknown as WorkspaceLeaf & {
    setViewState: ReturnType<typeof vi.fn>;
    history: { backHistory: unknown[]; forwardHistory: unknown[] };
  };
}

describe("forgetDeletedFixedNote", () => {
  it("戻る/進む履歴から削除済み固定ノートの項目だけを取り除く", async () => {
    const leaf = createLeaf({
      current: { type: "markdown", state: { file: "b.md" } },
      backHistory: [entry("markdown", "a.md"), entry("dstr-view", DELETED), entry("markdown", DELETED)],
      forwardHistory: [entry("dstr-view", DELETED), entry("markdown", "c.md")],
    });

    await forgetDeletedFixedNote([leaf], DELETED);

    expect(leaf.history.backHistory).toEqual([entry("markdown", "a.md")]);
    expect(leaf.history.forwardHistory).toEqual([entry("markdown", "c.md")]);
    expect(leaf.setViewState).not.toHaveBeenCalled();
  });

  it("削除済み固定ノートを表示中の Daystream leaf は空タブにする", async () => {
    const showing = createLeaf({ current: { type: "dstr-view", state: { file: DELETED } } });
    const legacy = createLeaf({ current: { type: "mfdi-view", state: { file: DELETED } } });
    const other = createLeaf({ current: { type: "dstr-view", state: { file: "dstr/Other.dstr.md" } } });

    await forgetDeletedFixedNote([showing, legacy, other], DELETED);

    expect(showing.setViewState).toHaveBeenCalledWith({ type: "empty" });
    expect(legacy.setViewState).toHaveBeenCalledWith({ type: "empty" });
    expect(other.setViewState).not.toHaveBeenCalled();
  });

  it("空タブへの切り替えで積まれた履歴も取り除く", async () => {
    const leaf = createLeaf({ current: { type: "dstr-view", state: { file: DELETED } } });
    leaf.setViewState.mockImplementation(async () => {
      leaf.history.backHistory.push(entry("dstr-view", DELETED));
    });

    await forgetDeletedFixedNote([leaf], DELETED);

    expect(leaf.history.backHistory).toEqual([]);
  });

  it("履歴を持たない leaf は無視する", async () => {
    const leaf = createLeaf({ current: { type: "empty" }, withoutHistory: true });

    await expect(forgetDeletedFixedNote([leaf], DELETED)).resolves.toBeUndefined();
  });
});
