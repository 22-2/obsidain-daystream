import {
  isDSTRFixedNotePath,
  normalizeFixedNotePath,
} from "src/core/fixed-note";
import { VIEW_TYPE_DSTR } from "src/core/view-types";
import type { DSTRViewState } from "src/features/workspace/views/state";
import {
  createFixedNoteViewState,
  DEFAULT_DSTR_VIEW_STATE,
} from "src/features/workspace/views/state";

// 意図: 固定ノートの判定に使うのは view の state と file パスだけなので、必要な形だけを要求する。
// WorkspaceLeaf はこの形を満たすため、実際の leaf をそのまま渡せる。
export type FixedNoteLeaf = {
  view?: { getState?: () => unknown; file?: { path?: string } | null };
  getViewState?: () => unknown;
};

type LeafWithState<L extends FixedNoteLeaf> = L & {
  view: { getState: () => unknown; file?: { path?: string } | null };
};

type UnknownRecord = Record<string, unknown>;

type DSTRViewStateWrapper = {
  type: string;
  state: DSTRViewState;
};

type ConvertibleMarkdownView = {
  view: UnknownRecord;
  state: UnknownRecord;
};

const DSTR_VIEW_TYPE = VIEW_TYPE_DSTR;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

// 意図: state の file は文字列のときだけ採用し、それ以外は空として扱う。
function readFilePath(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isViewStatefulLeaf<L extends FixedNoteLeaf>(
  leaf: L,
): leaf is LeafWithState<L> {
  const view = leaf.view;
  return !!view && typeof view.getState === "function";
}

// 意図: 再読込直後の前面にない leaf は遅延読み込みで view.file を持たないため、
// leaf の view state に保存されたパスも見て固定ノートを判定する。
function readFilePathFromViewState(viewState: unknown): string {
  if (!isRecord(viewState) || !isRecord(viewState.state)) return "";
  return readFilePath(viewState.state.file);
}

function resolveLeafFilePath(leaf: FixedNoteLeaf): string {
  const viewFilePath = isViewStatefulLeaf(leaf)
    ? leaf.view.file?.path
    : undefined;
  if (viewFilePath) return viewFilePath;
  return readFilePathFromViewState(leaf.getViewState?.());
}

export interface FixedNoteViewExtension {
  convertMarkdownViewState: (viewState: unknown) => DSTRViewStateWrapper;
  replaceOpenFixedMarkdownLeaves: <L extends FixedNoteLeaf>(params: {
    leaves: L[];
    attachDSTRView: (
      state: Partial<DSTRViewState>,
      preferredLeaf?: L,
    ) => Promise<L | undefined>;
  }) => Promise<void>;
}

export interface FixedNoteViewExtensionParams {
  isFixedNoteAvailable?: (filePath: string) => boolean;
  getPreferredFixedSessionNumber?: (filePath: string) => number | undefined;
}

// contribution の外側（main 等）が leaf 探索だけしたい場合に直接インポートできるよう standalone export にする。
// extension インターフェースに載せると「contribution に渡すオブジェクト」と「main が直接呼ぶ関数」の二重管理になるため分離した。
export function findExistingDSTRLeaf<L extends FixedNoteLeaf>(
  leaves: L[],
  state: Partial<DSTRViewState>,
): L | undefined {
  const isFixedMode = state.noteMode === "fixed";
  const fixedPath = normalizeFixedNotePath(readFilePath(state.file));

  return leaves.find((leaf) => {
    if (!isViewStatefulLeaf(leaf)) return false;
    const currentState: unknown = leaf.view.getState();
    // 意図: 状態がオブジェクトでない view は固定ノートとも periodic とも判定できないので対象外にする。
    if (!isRecord(currentState)) return false;
    if (!isFixedMode) return currentState.noteMode !== "fixed";
    return (
      currentState.noteMode === "fixed" &&
      normalizeFixedNotePath(readFilePath(currentState.file)) === fixedPath
    );
  });
}

// markdown view のうち、DSTR 固定ノートへ変換してよいものだけを返す。
function readConvertibleMarkdownView(
  viewState: unknown,
): ConvertibleMarkdownView | null {
  if (!isRecord(viewState) || viewState.type !== "markdown") return null;
  const state = viewState.state;
  // フラグが付与されている場合は強制的にMarkdownビューとして開く意図がある。
  // 意図: フラグはその場で開くときだけ有効にする。Markdown ビューの state には残らないため、
  // 戻る/進むや再起動で開き直したときは固定ノートとして Daystream ビューで開く。
  if (!isRecord(state) || state.__dstr_force_markdown) return null;
  return { view: viewState, state };
}

// 変換しない view state は、呼び出し元の既存の戻り値型に合わせてそのまま返す。
function passThroughViewState(viewState: unknown): DSTRViewStateWrapper {
  return viewState as DSTRViewStateWrapper;
}

function resolveFixedSessionNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 1
    ? value
    : null;
}

export function createFixedNoteViewExtension(
  params: FixedNoteViewExtensionParams = {},
): FixedNoteViewExtension {
  const { isFixedNoteAvailable, getPreferredFixedSessionNumber } = params;

  const convertMarkdownViewState = (viewState: unknown): DSTRViewStateWrapper => {
    const convertible = readConvertibleMarkdownView(viewState);
    if (!convertible) return passThroughViewState(viewState);
    const { view, state } = convertible;
    const filePath = readFilePath(state.file);
    if (!isDSTRFixedNotePath(filePath)) return passThroughViewState(viewState);

    // 意図: 削除済み固定ノートまで Daystream へ強制変換すると、空 state が復元されて誤解を招く。
    // 存在確認が失敗した場合は markdown のまま返し、呼び出し側で通常の欠損ハンドリングに委ねる。
    if (isFixedNoteAvailable && !isFixedNoteAvailable(filePath)) {
      return passThroughViewState(viewState);
    }

    const fixedSessionNumber =
      resolveFixedSessionNumber(state.fixedSessionNumber) ??
      resolveFixedSessionNumber(getPreferredFixedSessionNumber?.(filePath)) ??
      1;

    return {
      ...view,
      type: DSTR_VIEW_TYPE,
      state: {
        ...DEFAULT_DSTR_VIEW_STATE,
        ...createFixedNoteViewState(filePath),
        fixedSessionNumber,
      },
    };
  };

  return {
    convertMarkdownViewState,

    replaceOpenFixedMarkdownLeaves: async ({ leaves, attachDSTRView }) => {
      for (const leaf of leaves) {
        // 意図: setViewState での変換と同じ判定・state を使い、起動時だけ存在確認や
        // セッション番号の決め方が食い違わないようにする。
        const converted = convertMarkdownViewState({
          type: "markdown",
          state: { file: resolveLeafFilePath(leaf) },
        });
        if (converted.type !== DSTR_VIEW_TYPE) continue;
        await attachDSTRView(converted.state, leaf);
      }
    },
  };
}
