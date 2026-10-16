import type { WorkspaceLeaf } from "obsidian";
import {
  createFixedNoteViewExtension,
  findExistingDSTRLeaf,
} from "src/features/notes/extensions/fixed-note-view-extension";
import { describe, expect, it, vi } from "vitest";

describe("fixed note view extension", () => {
  it("converts fixed-note markdown state into a Daystream view state", () => {
    const extension = createFixedNoteViewExtension();

    const result = extension.convertMarkdownViewState({
      type: "markdown",
      state: { file: "MFDI/Inbox.mfdi.md" },
    });

    expect(result.type).toBe("mfdi-view");
    expect(result.state.noteMode).toBe("fixed");
    expect(result.state.file).toBe("MFDI/Inbox.mfdi.md");
  });

  it("restores fixedSessionNumber from incoming markdown state", () => {
    const extension = createFixedNoteViewExtension();

    const result = extension.convertMarkdownViewState({
      type: "markdown",
      state: { file: "MFDI/Inbox.mfdi.md", fixedSessionNumber: 4 },
    });

    expect(result.type).toBe("mfdi-view");
    expect(result.state.fixedSessionNumber).toBe(4);
  });

  it("keeps markdown view when fixed note is unavailable", () => {
    const extension = createFixedNoteViewExtension({
      isFixedNoteAvailable: () => false,
    });
    const state = {
      type: "markdown",
      state: { file: "MFDI/Missing.mfdi.md" },
    };

    expect(extension.convertMarkdownViewState(state)).toBe(state);
  });

  it("uses persisted fixedSessionNumber when markdown state does not have one", () => {
    const extension = createFixedNoteViewExtension({
      getPreferredFixedSessionNumber: () => 6,
    });

    const result = extension.convertMarkdownViewState({
      type: "markdown",
      state: { file: "MFDI/Inbox.mfdi.md" },
    });

    expect(result.type).toBe("mfdi-view");
    expect(result.state.fixedSessionNumber).toBe(6);
  });

  it("keeps forced markdown opens untouched", () => {
    const extension = createFixedNoteViewExtension();
    const state = {
      type: "markdown",
      state: {
        file: "MFDI/Inbox.mfdi.md",
        __dstr_force_markdown: true,
      },
    };

    expect(extension.convertMarkdownViewState(state)).toBe(state);
  });

  it("finds an existing fixed leaf by fixed path", () => {
    const leaf = {
      view: {
        getState: () => ({ noteMode: "fixed", file: "MFDI/Inbox.mfdi.md" }) as any,
      },
    } as WorkspaceLeaf;

    const result = findExistingDSTRLeaf([leaf], {
      noteMode: "fixed",
      file: "MFDI/Inbox.mfdi.md",
    });

    expect(result).toBe(leaf);
  });

  it("replaces already-open fixed markdown leaves via attach callback", async () => {
    const extension = createFixedNoteViewExtension({
      getPreferredFixedSessionNumber: () => 5,
    });
    const attachDSTRView = vi.fn(async () => undefined);
    const leaves = [
      {
        view: {
          file: { path: "MFDI/Inbox.mfdi.md" },
          getState: () => ({ noteMode: "periodic", file: null }) as any,
        },
      } as any,
    ];

    await extension.replaceOpenFixedMarkdownLeaves({ leaves, attachDSTRView });

    expect(attachDSTRView).toHaveBeenCalledWith(
      expect.objectContaining({
        noteMode: "fixed",
        file: "MFDI/Inbox.mfdi.md",
        fixedSessionNumber: 5,
      }),
      leaves[0],
    );
  });

  it("遅延読み込み中で view.file がない leaf も view state のパスから置き換える", async () => {
    const extension = createFixedNoteViewExtension();
    const attachDSTRView = vi.fn(async () => undefined);
    const leaves = [
      {
        view: {},
        getViewState: () => ({ type: "markdown", state: { file: "MFDI/Inbox.mfdi.md" } }),
      } as any,
    ];

    await extension.replaceOpenFixedMarkdownLeaves({ leaves, attachDSTRView });

    expect(attachDSTRView).toHaveBeenCalledWith(
      expect.objectContaining({ noteMode: "fixed", file: "MFDI/Inbox.mfdi.md" }),
      leaves[0],
    );
  });
});
