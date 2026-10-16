import type { DSTRStorage } from "src/core/storage";
import {
  getDraftMetadataStorageKey,
  getInputStorageKey,
} from "src/features/composer/store/slices/inputStorage";
import type { DSTRNoteMode } from "src/core/domain/note-mode";

export interface FixedSessionPersistenceState {
  storage: DSTRStorage | null;
  viewNoteMode: DSTRNoteMode;
  file: string | null;
}

export interface FixedSessionDraft {
  input: string;
  draftMetadata: Record<string, string>;
  draftMetadataBase: Record<string, string>;
}

/** 意図: セッションごとの未送信入力はcomposerの復元契約として一箇所で扱う。 */
export function persistFixedSessionDraft(
  state: FixedSessionPersistenceState,
  sessionNumber: number,
  draft: FixedSessionDraft,
): void {
  if (!state.storage || state.viewNoteMode !== "fixed") return;

  state.storage.set(getInputStorageKey(state.viewNoteMode, state.file, sessionNumber), draft.input);
  state.storage.set(getDraftMetadataStorageKey(state.viewNoteMode, state.file, sessionNumber), {
    draftMetadata: draft.draftMetadata,
    draftMetadataBase: draft.draftMetadataBase,
  });
}

export function restoreFixedSessionDraft(
  state: FixedSessionPersistenceState,
  sessionNumber: number,
): FixedSessionDraft {
  if (!state.storage || state.viewNoteMode !== "fixed") {
    return { input: "", draftMetadata: {}, draftMetadataBase: {} };
  }

  const draftMetadata = state.storage.get<{
    draftMetadata: Record<string, string>;
    draftMetadataBase: Record<string, string>;
  }>(getDraftMetadataStorageKey(state.viewNoteMode, state.file, sessionNumber), {
    draftMetadata: {},
    draftMetadataBase: {},
  });

  return {
    input: state.storage.get<string>(
      getInputStorageKey(state.viewNoteMode, state.file, sessionNumber),
      "",
    ),
    draftMetadata: draftMetadata.draftMetadata,
    draftMetadataBase: draftMetadata.draftMetadataBase,
  };
}
