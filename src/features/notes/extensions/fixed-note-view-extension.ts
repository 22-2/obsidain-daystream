import type { WorkspaceLeaf } from "obsidian";
import { isDSTRFixedNotePath, normalizeFixedNotePath } from "src/core/fixed-note";
import { VIEW_TYPE_DSTR } from "src/core/view-types";
import type { DSTRViewState } from "src/features/workspace/views/state";
import { createFixedNoteViewState, DEFAULT_DSTR_VIEW_STATE } from "src/features/workspace/views/state";

type LeafWithState = WorkspaceLeaf & {
  view: { getState: () => DSTRViewState; file?: { path?: string } };
};

type DSTRViewStateWrapper = {
  type: string;
  state: DSTRViewState;
};

const DSTR_VIEW_TYPE = VIEW_TYPE_DSTR;

function isViewStatefulLeaf(leaf: WorkspaceLeaf): leaf is LeafWithState {
  const view = (leaf as LeafWithState).view;
  return !!view && typeof view.getState === "function";
}

// 意図: 再読込直後の前面にない leaf は遅延読み込みで view.file を持たないため、
// leaf の view state に保存されたパスも見て固定ノートを判定する。
function resolveLeafFilePath(leaf: WorkspaceLeaf): string {
  const viewFilePath = isViewStatefulLeaf(leaf) ? leaf.view.file?.path : undefined;
  if (viewFilePath) return viewFilePath;
  const stateFile = (leaf.getViewState?.() as { state?: { file?: unknown } } | undefined)?.state?.file;
  return typeof stateFile === "string" ? stateFile : "";
}

export interface FixedNoteViewExtension {
  convertMarkdownViewState: (viewState: unknown) => DSTRViewStateWrapper;
  replaceOpenFixedMarkdownLeaves: (params: {
    leaves: WorkspaceLeaf[];
    attachDSTRView: (
      state: Partial<DSTRViewState>,
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
export function findExistingDSTRLeaf(
  leaves: WorkspaceLeaf[],
  state: Partial<DSTRViewState>,
): WorkspaceLeaf | undefined {
  const isFixedMode = state.noteMode === "fixed";
  const fixedPath = normalizeFixedNotePath(typeof state.file === "string" ? state.file : "");

  return leaves.find((leaf) => {
    if (!isViewStatefulLeaf(leaf)) return false;
    const currentState = leaf.view.getState() as DSTRViewState;
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
  if (candidate.state?.__dstr_force_markdown) return false;

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
      if (!shouldConvertViewState(viewState)) return viewState as DSTRViewStateWrapper;
      const candidate = viewState as {
        type?: string;
        state?: DSTRViewState;
      } as DSTRViewStateWrapper;
      const filePath = typeof candidate.state?.file === "string" ? candidate.state.file : "";
      if (!isDSTRFixedNotePath(filePath)) return viewState as DSTRViewStateWrapper;

      // 意図: 削除済み固定ノートまで Daystream へ強制変換すると、空 state が復元されて誤解を招く。
      // 存在確認が失敗した場合は markdown のまま返し、呼び出し側で通常の欠損ハンドリングに委ねる。
      if (isFixedNoteAvailable && !isFixedNoteAvailable(filePath)) {
        return viewState as DSTRViewStateWrapper;
      }

      const fixedSessionNumber =
        resolveFixedSessionNumber(candidate.state?.fixedSessionNumber) ??
        resolveFixedSessionNumber(getPreferredFixedSessionNumber?.(filePath)) ??
        1;

      return {
        ...candidate,
        type: DSTR_VIEW_TYPE,
        state: {
          ...DEFAULT_DSTR_VIEW_STATE,
          ...createFixedNoteViewState(filePath),
          fixedSessionNumber,
        },
      } as DSTRViewStateWrapper;
    },

    replaceOpenFixedMarkdownLeaves: async ({ leaves, attachDSTRView }) => {
      for (const leaf of leaves) {
        const filePath = resolveLeafFilePath(leaf);
        if (!isDSTRFixedNotePath(filePath)) continue;
        await attachDSTRView(
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
