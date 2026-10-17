import { ItemView, Scope } from "obsidian";
import { EditableTitleBar } from "src/core/ui/components/common/EditableTitleBar";
import type { DSTRViewState } from "src/features/workspace/views/state";
import { getFixedNoteTitle } from "src/features/workspace/views/state";

/** Owns the editable title chrome used by fixed-note views. */
export class DSTRFixedNoteTitle {
  private editableTitleBar: EditableTitleBar | null = null;

  constructor(
    private readonly view: ItemView,
    private readonly getState: () => DSTRViewState,
    private readonly onSubmitTitle: (newTitle: string) => Promise<void>,
  ) {}

  update(): void {
    if (this.getState().noteMode !== "fixed") return;

    if (!this.editableTitleBar) {
      this.editableTitleBar = new EditableTitleBar(this.view, {
        scope: new Scope(this.view.app.scope),
        getTitle: () => getFixedNoteTitle(this.getState().file),
        onSubmitTitle: (newTitle) => this.onSubmitTitle(newTitle),
      });
    }

    this.editableTitleBar.render();
  }

  focus(): void {
    this.editableTitleBar?.focus();
  }
}
