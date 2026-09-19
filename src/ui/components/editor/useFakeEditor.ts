import { FakeEditor } from "@22-2/obsidian-magical-editor";
import type { App, WorkspaceLeaf } from "obsidian";
import { useCallback, useEffect, useRef } from "react";
import type { CtrlEnterSendMode } from "src/settings";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Keeps a ref always in sync with the latest value of a callback,
 * avoiding stale closures without adding the callback to effect deps.
 */
function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

// ─── IME Composition Hook ─────────────────────────────────────────────────────

interface UseCompositionGuardOptions {
  onFlush: (text: string) => void;
  getFallbackText: () => string;
}

/**
 * Returns handlers and a wrapped onChange that suppresses intermediate
 * IME composition events, flushing the final value on compositionend.
 */
function useCompositionGuard({ onFlush, getFallbackText }: UseCompositionGuardOptions) {
  const isComposingRef = useRef(false);
  const pendingTextRef = useRef<string | null>(null);
  const onFlushRef = useLatestRef(onFlush);
  const getFallbackTextRef = useLatestRef(getFallbackText);

  const handleChange = useCallback((text: string) => {
    if (isComposingRef.current) {
      pendingTextRef.current = text;
      return;
    }
    onFlushRef.current(text);
  }, []);

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback(() => {
    isComposingRef.current = false;
    const text = pendingTextRef.current ?? getFallbackTextRef.current();
    pendingTextRef.current = null;
    onFlushRef.current(text);
  }, []);

  const reset = useCallback(() => {
    isComposingRef.current = false;
    pendingTextRef.current = null;
  }, []);

  return { handleChange, handleCompositionStart, handleCompositionEnd, reset };
}

/**
 * Ctrl+Enter 送信キーバインドの有効/無効を反映する。
 * view は ready 完了まで undefined になり得るため未準備時は何もしない。
 * また FakeEditor の view は EmbeddableMarkdownEditor だが、型 union 上は
 * MarkdownView も含むため `in` で絞り込んでから呼ぶ。
 */
function applyCtrlEnterKeyBinding(
  editor: FakeEditor | null,
  ctrlEnterSends: CtrlEnterSendMode | undefined,
  isExpanded: boolean | undefined,
) {
  const view = editor?.view;
  if (view && "toggleCtrlEnterKeyBinding" in view) {
    // 展開中は Scope 側のハンドラも外し、CodeMirror 側の callback ガードと
    // 合わせて Ctrl+Enter の送信経路を完全に止める。
    view.toggleCtrlEnterKeyBinding(ctrlEnterSends === "collapsed_only" && !isExpanded);
  }
}

// ─── Editor Initialization Hook ───────────────────────────────────────────────

interface UseFakeEditorOptions {
  app: App;
  leaf: WorkspaceLeaf;
  initialValue: string;
  placeholder?: string;
  isReadOnly?: boolean;
  readonlyPlaceholder?: string;
  onChange: (text: string) => void;
  onSubmit?: () => void;
  ctrlEnterSends?: CtrlEnterSendMode;
  isExpanded?: boolean;
}

interface UseFakeEditorResult {
  editorRef: React.RefObject<FakeEditor | null>;
  /** true の間は setContent 由来の onChange エコーバックを抑止する */
  isSyncingRef: React.RefObject<boolean>;
}

export function useFakeEditor(
  containerRef: React.RefObject<HTMLDivElement | null>,
  options: UseFakeEditorOptions,
): UseFakeEditorResult {
  const editorRef = useRef<FakeEditor | null>(null);
  // setContent → CodeMirror dispatch → onChange が同期発火するため、
  // プログラム的な setContent 中は onChange を抑止して再帰サイクルを防ぐ。
  const isSyncingRef = useRef(false);
  const optionsRef = useLatestRef(options);

  const composition = useCompositionGuard({
    onFlush: (text) => optionsRef.current.onChange(text),
    getFallbackText: () => editorRef.current?.getContent() ?? "",
  });

  useEffect(() => {
    let active = true;
    let isEditorReady = false;

    const init = async () => {
      if (!containerRef.current) return;
      containerRef.current.empty();

      const { app, leaf, initialValue, placeholder, isReadOnly, readonlyPlaceholder } =
        optionsRef.current;

      const editor = new FakeEditor(app, {
        onChange: (text: string) => {
          // isSyncingRef: プログラム的な setContent 由来のエコーを破棄する。
          // FakeEditor の setContent → editor.setValue → CM6 dispatch で
          // onChange が同期発火するため、ガード無しだと
          // onChange → syncInputSession → set() → re-render → useEffect → setContent
          // の再帰サイクルが散発的に発生し入力フリーズを引き起こす。
          if (active && isEditorReady && !isSyncingRef.current) composition.handleChange(text);
        },
        onEnter: (_editor: unknown, mod: boolean, shift: boolean) => {
          // disabled または展開中はホットキー送信を無効化する。
          // ライブラリの toggleCtrlEnterKeyBinding は Obsidian Scope ハンドラのみ
          // 解除し、CodeMirror 側の Mod-Enter キーマップ（Prec.highest）は残るため、
          // 送信判定の単一の真実をここに置いて明示的にガードする。展開状態の
          // 変更直後も stale な CodeMirror callback から送信されないようにする。
          if (
            optionsRef.current.ctrlEnterSends !== "collapsed_only" ||
            optionsRef.current.isExpanded
          ) {
            return false;
          }
          if (mod && !shift) {
            optionsRef.current.onSubmit?.();
            return true;
          }
          return false;
        },
        parentScope: leaf.view.scope!,
        initialContent: initialValue ?? "",
        placeholder,
        isReadOnly,
        readonlyPlaceholder,
      });

      if (!active) {
        editor.destroy();
        return;
      }

      editorRef.current = editor;
      editor.loadToDom(containerRef.current!);
      await editor.ready;

      if (!active) {
        editor.destroy();
        return;
      }

      // BaseEditor.ready は、初期化中に setContent が走った場合の再同期まで含めて完了する。
      // ここで再投入を重ねると初回表示で不要なレイアウト揺れが発生するため行わない。
      isEditorReady = true;

      // Ctrl+Enter 送信の設定と展開状態を初期適用する。
      // editor.view は ready 完了まで undefined のため、ここまで待ってから安全に呼ぶ。
      // （ready 前に呼ぶと undefined アクセスで throw し、エラー再描画でエディタが多重生成される）
      applyCtrlEnterKeyBinding(
        editor,
        optionsRef.current.ctrlEnterSends,
        optionsRef.current.isExpanded,
      );

      const editorContainer = editor.view?.containerEl;
      if (!editorContainer) return;

      editorContainer.addEventListener("compositionstart", composition.handleCompositionStart);
      editorContainer.addEventListener("compositionend", composition.handleCompositionEnd);

      // Patch destroy to clean up composition listeners
      const originalDestroy = editor.destroy.bind(editor);
      editor.destroy = () => {
        editorContainer.removeEventListener("compositionstart", composition.handleCompositionStart);
        editorContainer.removeEventListener("compositionend", composition.handleCompositionEnd);
        originalDestroy();
      };
    };

    init();

    return () => {
      active = false;
      isEditorReady = false;
      composition.reset();
      const editor = editorRef.current;
      editorRef.current = null;
      editor?.destroy();
    };
  }, []); // Intentionally empty: editor is initialized once per mount.

  // 設定変更または展開状態の変更をマウント済みエディタへ反映する。
  // 初回マウント時は view 未準備のため no-op になり、init 内の初期適用に委ねる。
  useEffect(() => {
    applyCtrlEnterKeyBinding(editorRef.current, options.ctrlEnterSends, options.isExpanded);
  }, [options.ctrlEnterSends, options.isExpanded]);

  return { editorRef, isSyncingRef };
}
