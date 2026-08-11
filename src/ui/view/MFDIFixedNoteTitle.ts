import { ItemView, Scope } from "obsidian";
import { EditableTitleBar } from "src/ui/components/common/EditableTitleBar";
import type { MFDIViewState } from "src/ui/view/state";
import { getFixedNoteTitle } from "src/ui/view/state";

/** Owns the editable title chrome used by fixed-note views. */
export class MFDIFixedNoteTitle {
  private editableTitleBar: EditableTitleBar | null = null;

  constructor(
    private readonly view: ItemView,
    private readonly getState: () => MFDIViewState,
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
