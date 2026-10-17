import { type Extension } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { ViewPlugin, type ViewUpdate } from "@codemirror/view";
import { createLogger } from "src/core/logger";

const TARGET_VIEW_SELECTOR = '[data-type="dstr-view"], [data-type="dstr-editor-view"]';
const CONTENT_PADDING_PROPERTY = "padding-bottom";

const logger = createLogger("dstr:cm-bottom-padding");

/**
 * Daystream の 2 つのビューだけで .cm-content の下端余白を補正する。
 */
export const extension: Extension = ViewPlugin.fromClass(
  class DSTRBottomPaddingPlugin {
    private readonly resizeObserver: ResizeObserver | null;
    private isTargetCache: boolean | null = null;

    constructor(private readonly view: EditorView) {
      this.resizeObserver = new ResizeObserver(() => this.scheduleMeasure());

      // 意図: constructor では DOM がまだ未接続なことがあるため、
      // ターゲット判定は最初の測定時に遅延実行する。
      this.resizeObserver.observe(this.view.scrollDOM);
      this.resizeObserver.observe(this.view.dom);

      this.scheduleMeasure();
    }

    update(update: ViewUpdate): void {
      if (update.docChanged || update.viewportChanged || update.geometryChanged) {
        logger.debug("schedule from update", {
          docChanged: update.docChanged,
          viewportChanged: update.viewportChanged,
          geometryChanged: update.geometryChanged,
        });
        this.scheduleMeasure();
      }
    }

    destroy(): void {
      this.resizeObserver?.disconnect();
      logger.debug("destroy");

      if (this.isTargetCache) {
        this.view.contentDOM.style.removeProperty(CONTENT_PADDING_PROPERTY);
      }
    }

    /**
     * 対象のビューかどうかを判定・キャッシュする
     */
    private get isTargetView(): boolean {
      if (this.isTargetCache !== null) return this.isTargetCache;

      // DOMがツリーに接続されていない場合は判定を保留する
      if (!this.view.dom.isConnected) return false;

      const targetElement = this.view.dom.closest(TARGET_VIEW_SELECTOR);
      this.isTargetCache = targetElement !== null;

      logger.debug("target resolved", {
        viewType: targetElement?.getAttribute("data-type"),
        isTarget: this.isTargetCache,
      });

      return this.isTargetCache;
    }

    private scheduleMeasure(): void {
      this.view.requestMeasure({
        read: () => this.readPaddingMeasurement(),
        write: (measuredPadding) => {
          if (measuredPadding !== null) {
            this.writePadding(measuredPadding);
          }
        },
      });
    }

    private readPaddingMeasurement(): number | null {
      if (!this.isTargetView) return null;

      const line = this.getLastLineElement();
      const scroller = this.view.scrollDOM;

      if (!line) {
        logger.debug("missing measurement targets", {
          hasLine: false,
          hasScroller: true, // scrollDOM は必ず存在する
        });
        return 0;
      }

      const lineBottom = line.getBoundingClientRect().bottom;
      const scrollerBottom = scroller.getBoundingClientRect().bottom;
      // 意図: flex レイアウト由来で scroller の高さは小数になり得るため、
      // ceil だと padding が実際の余白を最大1px上回り、
      // sizer > scroller となって不要なスクロールバーが出る。floor で切り捨てる。
      const measuredPadding = Math.max(0, Math.floor(scrollerBottom - lineBottom));

      logger.debug("measure", {
        lineBottom,
        scrollerBottom,
        measuredPadding,
      });

      return measuredPadding;
    }

    private writePadding(measuredPadding: number): void {
      const nextPadding = `${measuredPadding}px`;
      const currentPadding = this.view.contentDOM.style.getPropertyValue(CONTENT_PADDING_PROPERTY);

      // 意図: 既存の padding を上書きするが、同値なら無駄な再描画を避ける。
      if (currentPadding === nextPadding) return;

      this.view.contentDOM.style.setProperty(CONTENT_PADDING_PROPERTY, nextPadding);

      logger.debug("apply padding", { paddingBottom: nextPadding });
    }

    /**
     * .cm-content 内の最後にレンダリングされている .cm-line を取得する
     */
    private getLastLineElement(): HTMLElement | null {
      // querySelectorAll を避け、DOMの末尾から探索してパフォーマンスを最適化する
      let el = this.view.contentDOM.lastElementChild;
      while (el !== null) {
        if (el.classList.contains("cm-line")) {
          return el as HTMLElement;
        }
        el = el.previousElementSibling;
      }
      return null;
    }
  },
);
