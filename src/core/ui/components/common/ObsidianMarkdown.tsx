import { MarkdownRenderer } from "obsidian";
import { type FC, useLayoutEffect, useRef } from "react";
import { Box } from "src/core/ui/components/primitives";
import { useAppContext } from "src/core/ui/context/AppContext";
import { useObsidianComponent } from "src/core/ui/context/ComponentContext";
import { reportError } from "src/core/error-report";

interface Props {
  content: string;
  sourcePath?: string;
}

// ポップアウトウィンドウの要素は別の realm にあり instanceof HTMLElement では判定できないため、nodeType で確認する。
function isElement(target: EventTarget | null): target is Element {
  return target !== null && "nodeType" in target && target.nodeType === Node.ELEMENT_NODE;
}

export const ObsidianMarkdown: FC<Props> = ({ content, sourcePath }) => {
  const { shell } = useAppContext();
  const rootRef = useRef<HTMLDivElement>(null);
  const component = useObsidianComponent();

  // MarkdownRendererはDOMを直接操作するため、useLayoutEffectで描画する
  // [Obsidianの別ウィンドウ表示遅延 - Claude](https://claude.ai/chat/5e582248-0edd-41bf-8cb7-3e2f491f8931)
  useLayoutEffect(() => {
    if (!rootRef.current) return;

    rootRef.current.empty();

    void MarkdownRenderer.render(
      shell.getRawApp(),
      content,
      rootRef.current,
      sourcePath ?? "",
      component,
    ).catch((error) =>
      reportError({ context: "Failed to render markdown", error, details: { sourcePath } }),
    );
  }, [content, sourcePath, shell, component]);

  return (
    <Box
      ref={rootRef}
      className="markdown-rendered block dark:text-[var(--dstr-content-color-dark)]"
      onClick={(e) => {
        const el = e.target;
        // 応急処置
        // なぜかObsidianのMarkdownRendererはaタグにonClickをつけないとリンクが機能しない

        if (!isElement(el) || el.tagName !== "A") {
          return;
        }
        if (!el.classList.contains("internal-link")) {
          return;
        }
        e.preventDefault();
        const href = el.getAttribute("data-href");
        void shell
          .getRawApp()
          .workspace.getLeaf()
          .openLinkText(href ?? "", sourcePath ?? "");
      }}
    />
  );
};
