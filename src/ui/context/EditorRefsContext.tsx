import type { ReactNode, RefObject } from "react";
import { createContext, useContext, useRef } from "react";
import type { ObsidianLiveEditorRef } from "src/ui/components/editor/ObsidianLiveEditor";

interface EditorRefsContextValue {
  inputRef: RefObject<ObsidianLiveEditorRef | null>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  // Virtualizer の startMargin 計算用: InputArea + StatusBar を包む要素
  listHeaderRef: RefObject<HTMLDivElement | null>;
}

const EditorRefsContext = createContext<EditorRefsContextValue | null>(null);

export function EditorRefsProvider({ children }: { children: ReactNode }) {
  const inputRef = useRef<ObsidianLiveEditorRef | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const listHeaderRef = useRef<HTMLDivElement | null>(null);

  return (
    <EditorRefsContext.Provider value={{ inputRef, scrollContainerRef, listHeaderRef }}>
      {children}
    </EditorRefsContext.Provider>
  );
}

export function useEditorRefs(): EditorRefsContextValue {
  const ctx = useContext(EditorRefsContext);
  if (!ctx) throw new Error("useEditorRefs must be used within EditorRefsProvider");
  return ctx;
}
