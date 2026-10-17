import { WorkspaceLeaf } from "obsidian";
import type { Settings } from "src/core/domain/settings";
import { LEGACY_DAYSTREAM_IDENTIFIERS } from "src/core/legacy-identifiers";
import { VIEW_TYPE_DSTR_EDITOR } from "src/core/view-types";
import {
  DSTREditorView,
  LegacyDSTREditorView,
} from "src/features/composer/views/DSTREditorView";
import { describe, expect, it } from "vitest";

describe("DSTREditorView type", () => {
  it("uses the registered DSTR editor type", () => {
    const view = new DSTREditorView(new WorkspaceLeaf(), {} as Settings);

    expect(view.getViewType()).toBe(VIEW_TYPE_DSTR_EDITOR);
  });

  it("keeps the legacy type only for workspace migration", () => {
    const view = new LegacyDSTREditorView(new WorkspaceLeaf(), {} as Settings);

    expect(view.getViewType()).toBe(
      LEGACY_DAYSTREAM_IDENTIFIERS.editorViewType,
    );
  });
});
