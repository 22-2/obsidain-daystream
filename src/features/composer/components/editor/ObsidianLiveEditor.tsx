import { type FakeEditor } from "@22-2/obsidian-magical-editor";
import type { App, WorkspaceLeaf } from "obsidian";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { CtrlEnterSendMode } from "src/core/domain/settings";
import { useFakeEditor } from "src/features/composer/components/editor/useFakeEditor";
import { Box } from "src/core/ui/components/primitives/Box";
import { cn } from "src/core/ui/components/primitives/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ObsidianLiveEditorRef {
  focus: FakeEditor["focus"];
  getValue: FakeEditor["getContent"];
  getContentSnapshot: FakeEditor["getContentSnapshot"];
  subscribeContent: FakeEditor["subscribeContent"];
  setContent: FakeEditor["setContent"];
}

interface ObsidianLiveEditorProps {
  leaf: WorkspaceLeaf;
  app: App;
  initialValue: string;
  externalVersion?: number;
  onChange: (text: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  isReadOnly?: boolean;
  readonlyPlaceholder?: string;
  className?: string;
  ctrlEnterSends?: CtrlEnterSendMode;
  isExpanded?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ObsidianLiveEditor = forwardRef<ObsidianLiveEditorRef, ObsidianLiveEditorProps>(
  (
    {
      leaf,
      app,
      initialValue,
      externalVersion,
      onChange,
      onSubmit,
      placeholder,
      isReadOnly,
      readonlyPlaceholder,
      className,
      ctrlEnterSends,
      isExpanded,
      ...boxProps
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const lastExternalVersionRef = useRef(externalVersion ?? 0);
    // externalVersion 経由で setContent する際、常に最新の initialValue を投入する必要がある。
    // useRef(initialValue) はマウント時に固定されてしまうため、毎レンダーで最新値に同期する。
    const initialValueRef = useRef(initialValue);
    initialValueRef.current = initialValue;

    const { editorRef, isSyncingRef } = useFakeEditor(containerRef, {
      app,
      leaf,
      initialValue,
      placeholder,
      isReadOnly,
      readonlyPlaceholder,
      onChange,
      onSubmit,
      ctrlEnterSends,
      isExpanded,
    });

    // Expose imperative API to parent
    useImperativeHandle(ref, () => ({
      focus: () => editorRef.current?.focus(),
      getValue: () => editorRef.current?.getContent() ?? "",
      getContentSnapshot: () => editorRef.current?.getContentSnapshot() ?? "",
      subscribeContent: (listener) => editorRef.current?.subscribeContent(listener) ?? (() => {}),
      setContent: (text) => {
        // プログラム的 setContent 中は onChange エコーを抑止する
        isSyncingRef.current = true;
        editorRef.current?.setContent(text);
        isSyncingRef.current = false;
      },
    }));

    // Sync read-only state after mount
    useEffect(() => {
      editorRef.current?.setReadOnly(!!isReadOnly);
    }, [isReadOnly]);

    // Sync placeholder after mount
    useEffect(() => {
      editorRef.current?.setPlaceholder(placeholder ?? "", readonlyPlaceholder);
    }, [placeholder, readonlyPlaceholder]);

    // プログラムによる外部からのコンテンツ上書き (replaceInput 等) 限定で同期させる
    // ユーザー由来の通常入力では外部バージョンは変わらないため、途中でカーソルが飛ぶ事故を防ぐ
    useEffect(() => {
      if (externalVersion !== undefined && externalVersion !== lastExternalVersionRef.current) {
        lastExternalVersionRef.current = externalVersion;
        if (editorRef.current) {
          isSyncingRef.current = true;
          editorRef.current.setContent(initialValueRef.current);
          isSyncingRef.current = false;
        }
      }
    }, [externalVersion]);

    return (
      <Box className={cn(className)} {...boxProps}>
        <Box ref={containerRef} className="dstr-live-editor-container" />
      </Box>
    );
  },
);

ObsidianLiveEditor.displayName = "ObsidianLiveEditor";
