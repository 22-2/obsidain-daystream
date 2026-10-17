import type { WorkspaceLeaf } from "obsidian";

/** Opens a vault note in the source editor, bypassing Daystream's fixed-note view routing. */
export async function openMarkdownNote(leaf: WorkspaceLeaf, filePath: string): Promise<void> {
  // 意図: Daystream の固定ノート自動ルーティングを避け、どの呼び出し元からも
  // ノート本文を Markdown エディタで開けるようにする。
  await leaf.setViewState({
    type: "markdown",
    active: true,
    state: { file: filePath, __dstr_force_markdown: true },
  });
}
