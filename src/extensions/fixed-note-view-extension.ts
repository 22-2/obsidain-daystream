import type { WorkspaceLeaf } from "obsidian";
import { isMFDIFixedNotePath, normalizeFixedNotePath } from "src/core/fixed-note";
import type { MFDIViewState } from "src/ui/view/state";
import { createFixedNoteViewState, DEFAULT_MFDI_VIEW_STATE } from "src/ui/view/state";

type LeafWithState = WorkspaceLeaf & {
  view: { getState: () => MFDIViewState; file?: { path?: string } };
};

type MFDIViewStateWrapper = {
  type: string;
  state: MFDIViewState;
};

const MFDI_VIEW_TYPE = "mfdi-view";

function isViewStatefulLeaf(leaf: WorkspaceLeaf): leaf is LeafWithState {
  const view = (leaf as LeafWithState).view;
  return !!view && typeof view.getState === "function";
}

export interface FixedNoteViewExtension {
  convertMarkdownViewState: (viewState: unknown) => MFDIViewStateWrapper;
  replaceOpenFixedMarkdownLeaves: (params: {
    leaves: WorkspaceLeaf[];
    attachMFDIView: (
      state: Partial<MFDIViewState>,
      preferredLeaf?: WorkspaceLeaf,
    ) => Promise<WorkspaceLeaf | undefined>;
  }) => Promise<void>;
}

export interface FixedNoteViewExtensionParams {
  isFixedNoteAvailable?: (filePath: string) => boolean;
  getPreferredFixedSessionNumber?: (filePath: string) => number | undefined;
}

// contribution の外側（main 等）が leaf 探索だけしたい場合に直接インポートできるよう standalone export にする。
// extension インターフェースに載せると「contribution に渡すオブジェクト」と「main が直接呼ぶ関数」の二重管理になるため分離した。
export function findExistingMFDILeaf(
  leaves: WorkspaceLeaf[],
  state: Partial<MFDIViewState>,
): WorkspaceLeaf | undefined {
  const isFixedMode = state.noteMode === "fixed";
  const fixedPath = normalizeFixedNotePath(typeof state.file === "string" ? state.file : "");

  return leaves.find((leaf) => {
    if (!isViewStatefulLeaf(leaf)) return false;
    const currentState = leaf.view.getState() as MFDIViewState;
    return isFixedMode
      ? currentState.noteMode === "fixed" &&
          normalizeFixedNotePath(currentState.file ?? "") === fixedPath
      : currentState.noteMode !== "fixed";
  });
}

function shouldConvertViewState(viewState: unknown): boolean {
  if (!viewState || typeof viewState !== "object") return false;
  const candidate = viewState as {
    type?: string;
    state?: Record<string, unknown>;
  };
  if (candidate.type !== "markdown") return false;

  // フラグが付与されている場合は強制的にMarkdownビューとして開く意図がある。
  if (candidate.state?.__mfdi_force_markdown) return false;

  return true;
}

function resolveFixedSessionNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 ? value : null;
}

export function createFixedNoteViewExtension(
  params: FixedNoteViewExtensionParams = {},
): FixedNoteViewExtension {
  const { isFixedNoteAvailable, getPreferredFixedSessionNumber } = params;

  return {
    convertMarkdownViewState: (viewState) => {
      if (!shouldConvertViewState(viewState)) return viewState as MFDIViewStateWrapper;
      const candidate = viewState as {
        type?: string;
        state?: MFDIViewState;
      } as MFDIViewStateWrapper;
      const filePath = typeof candidate.state?.file === "string" ? candidate.state.file : "";
      if (!isMFDIFixedNotePath(filePath)) return viewState as MFDIViewStateWrapper;

      // 意図: 削除済み固定ノートまで MFDI へ強制変換すると、空 state が復元されて誤解を招く。
      // 存在確認が失敗した場合は markdown のまま返し、呼び出し側で通常の欠損ハンドリングに委ねる。
      if (isFixedNoteAvailable && !isFixedNoteAvailable(filePath)) {
        return viewState as MFDIViewStateWrapper;
      }

      const fixedSessionNumber =
        resolveFixedSessionNumber(candidate.state?.fixedSessionNumber) ??
        resolveFixedSessionNumber(getPreferredFixedSessionNumber?.(filePath)) ??
        1;

      return {
        ...candidate,
        type: MFDI_VIEW_TYPE,
        state: {
          ...DEFAULT_MFDI_VIEW_STATE,
          ...createFixedNoteViewState(filePath),
          fixedSessionNumber,
        },
      } as MFDIViewStateWrapper;
    },

    replaceOpenFixedMarkdownLeaves: async ({ leaves, attachMFDIView }) => {
      for (const leaf of leaves) {
        const filePath = isViewStatefulLeaf(leaf) ? (leaf.view.file?.path ?? "") : "";
        if (!isMFDIFixedNotePath(filePath)) continue;
        await attachMFDIView(
          {
            ...createFixedNoteViewState(filePath),
            fixedSessionNumber:
              resolveFixedSessionNumber(getPreferredFixedSessionNumber?.(filePath)) ?? 1,
          },
          leaf,
        );
      }
    },
  };
}
