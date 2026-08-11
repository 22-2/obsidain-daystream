import type { Commands } from "@obsidian-typings/obsidian-public-latest";
import type { App, Editor, TAbstractFile, WorkspaceLeaf } from "obsidian";
import { MarkdownView, TFile } from "obsidian";
import { joinWithSingleBoundaryNewline, skipImmediateLineBreak } from "src/core/post-utils";
import { parseMarkdownList } from "src/core/strings";
import { parseTaskTimestamp } from "src/core/task-parser";
import type { Task } from "src/core/task-text";

interface UnsafeAppInterface {
  appId: string;
  commands: Commands;
  plugins?: {
    getPlugin(id: string): unknown;
  };
  internalPlugins?: {
    getPluginById(id: string): unknown;
  };
}

export class ObsidianAppShell {
  // Obsidian 依存をここに集約して、下位層へ生の App を漏らしにくくする。
  protected unsafeApp: App & UnsafeAppInterface;

  constructor(app: App) {
    this.unsafeApp = app as App & UnsafeAppInterface;
  }

  getRawApp(): App {
    return this.unsafeApp;
  }

  getAppId(): string {
    return this.unsafeApp.appId;
  }

  getVault() {
    return this.unsafeApp.vault;
  }

  getWorkspace() {
    return this.unsafeApp.workspace;
  }

  trigger(eventName: string, ...args: unknown[]) {
    this.getWorkspace().trigger(eventName, ...args);
  }

  on(eventName: string, callback: (this: WorkspaceLeaf, ...args: unknown[]) => void) {
    const w = this.getWorkspace();
    // @ts-expect-error
    w.on(eventName, callback.bind(w));
  }

  off(eventName: string, callback: (this: WorkspaceLeaf, ...args: unknown[]) => void) {
    const w = this.getWorkspace();
    // @ts-expect-error
    w.off(eventName, callback.bind(w));
  }

  getMetadataCache() {
    return this.unsafeApp.metadataCache;
  }

  getFileManager() {
    return this.unsafeApp.fileManager;
  }

  getCommunityPlugin<T = unknown>(id: string): T | undefined {
    return this.unsafeApp.plugins?.getPlugin(id) as T | undefined;
  }

  getInternalPluginById<T = unknown>(id: string): T | undefined {
    return this.unsafeApp.internalPlugins?.getPluginById(id) as T | undefined;
  }

  getAbstractFileByPath(path: string): TAbstractFile | null {
    return this.unsafeApp.vault.getAbstractFileByPath(path);
  }

  getRootFolder() {
    return this.unsafeApp.vault.getRoot();
  }

  async loadFile(path: string): Promise<string> {
    return this.unsafeApp.vault.adapter.read(path);
  }

  async writeFile(path: string, content: string): Promise<void> {
    const existing = this.unsafeApp.vault.getAbstractFileByPath(path);

    // 意図: adapter.write は Vault/MetadataCache の変更イベント経路を素通りしやすい。
    // 既存ノート更新は vault.modify を使い、indexer と UI 同期を必ず発火させる。
    if (existing instanceof TFile) {
      await this.unsafeApp.vault.modify(existing, content);
      return;
    }

    await this.unsafeApp.vault.adapter.write(path, content);
  }

  appendFile(path: string, text: string) {
    return this.unsafeApp.vault.adapter.append(path, text);
  }

  insertTextToEnd(file: TFile, text: string) {
    return this.appendFile(file.path, text);
  }

  async replaceRange(
    path: string,
    startOffset: number,
    endOffset: number,
    replacement: string,
  ): Promise<string> {
    const origin = await this.loadFile(path);
    const newContent = origin.slice(0, startOffset) + replacement + origin.slice(endOffset);
    await this.writeFile(path, newContent);
    // 意図: 書き込み後の全文を返すことで、呼び出し側が再読込なしで
    // DB インデックスの即時反映（write-through）に使えるようにする。
    return newContent;
  }

  async setCheckMark(path: string, mark: "x" | " " | string, offset: number): Promise<void> {
    const origin = await this.loadFile(path);
    const markOffset = offset + origin.slice(offset).indexOf("[") + 1;
    await this.writeFile(
      path,
      `${origin.slice(0, markOffset)}${mark}${origin.slice(markOffset + 1)}`,
    );
  }

  private buildContentWithInsertedText(content: string, text: string, after: string): string {
    if (!after) {
      return joinWithSingleBoundaryNewline(content, text);
    }

    const index = content.indexOf(after);
    if (index === -1) {
      return joinWithSingleBoundaryNewline(content, text);
    }

    const insertIndex = skipImmediateLineBreak(content, index + after.length);
    return (
      joinWithSingleBoundaryNewline(content.slice(0, insertIndex), text) +
      content.slice(insertIndex)
    );
  }

  async insertTextAfter(file: TFile, text: string, after: string): Promise<string> {
    const content = await this.loadFile(file.path);
    const newContent = this.buildContentWithInsertedText(content, text, after);

    // 意図: 新規作成直後のノートは path 解決が一瞬遅れる場合があり、
    // path ベース書き込みだと adapter.write へ落ちて変更イベントを取りこぼす。
    // insertTextAfter は TFile を受け取っているため、常に vault.modify を使う。
    await this.modifyVaultFile(file, newContent);
    return newContent;
  }

  async insertTextAfterEnsuringMarker(file: TFile, text: string, after: string): Promise<string> {
    // 意図: 「マーカー追記」と「本文挿入」を別々に書き込むと vault の
    // modify イベントが多重発火し、インデックス・SWR 再検証が連鎖して
    // タイムラインがガクつく。1 read + 1 write に畳んで発火を最小化する。
    const content = await this.loadFile(file.path);
    const base =
      after && !content.includes(after) ? joinWithSingleBoundaryNewline(content, after) : content;
    const newContent = this.buildContentWithInsertedText(base, text, after);
    await this.modifyVaultFile(file, newContent);
    return newContent;
  }

  async cachedReadFile(file: TFile): Promise<string> {
    return this.unsafeApp.vault.cachedRead(file);
  }

  async readVaultFile(file: TFile): Promise<string> {
    return this.unsafeApp.vault.read(file);
  }

  async modifyVaultFile(file: TFile, content: string): Promise<void> {
    await this.unsafeApp.vault.modify(file, content);
  }

  async createFolder(path: string): Promise<void> {
    await this.unsafeApp.vault.createFolder(path);
  }

  async createFile(path: string, content: string): Promise<TFile> {
    return this.unsafeApp.vault.create(path, content);
  }

  getLeaf(newLeaf: boolean): WorkspaceLeaf {
    return this.unsafeApp.workspace.getLeaf(newLeaf);
  }

  revealLeaf(leaf: WorkspaceLeaf) {
    return this.unsafeApp.workspace.revealLeaf(leaf);
  }

  getLeavesOfType(type: string): WorkspaceLeaf[] {
    return this.unsafeApp.workspace.getLeavesOfType(type);
  }

  getActiveFile(): TFile | null {
    return this.unsafeApp.workspace.getActiveFile();
  }

  getActiveMarkdownView(): MarkdownView | null {
    return this.unsafeApp.workspace.getActiveViewOfType(MarkdownView);
  }

  getActiveMarkdownEditor(): Editor | null {
    return this.getActiveMarkdownView()?.editor ?? null;
  }

  async getTasks(file: TFile): Promise<Task[] | null> {
    const content = await this.loadFile(file.path);
    const lines = content.split("\n");

    return (
      this.getMetadataCache()
        .getFileCache(file)
        ?.listItems?.filter((x) => x.task != null)
        .map((x) => {
          const startLine = x.position.start.line;
          const endLine = x.position.end.line;

          let lastLine = endLine;
          for (let i = endLine + 1; i < lines.length; i++) {
            const line = lines[i];
            if (line.trim().length > 0 && !line.startsWith(" ") && !line.startsWith("\t")) {
              break;
            }
            lastLine = i;
          }

          const taskContent = lines.slice(startLine, lastLine + 1).join("\n");
          const { content: rawName } = parseMarkdownList(taskContent);

          const { displayName, timestamp } = parseTaskTimestamp(rawName, file.basename);

          return {
            mark: x.task!,
            name: displayName,
            offset: x.position.start.offset,
            path: file.path,
            timestamp,
          };
        }) ?? null
    );
  }
}
