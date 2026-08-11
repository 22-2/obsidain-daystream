import { CONTENT_VIEW } from "src/ui/config/consntants";
import type { ContentView } from "src/ui/types";
import { cn } from "src/ui/components/primitives/utils";

export const ContentViewSwitcher: React.FC<{
  value: ContentView;
  onChange: (value: ContentView) => void;
}> = ({ value, onChange }) => (
  <nav
    className="mfdi-content-view-switcher"
    aria-label="メインビュー"
    role="tablist"
  >
    <button
      type="button"
      role="tab"
      aria-selected={value === CONTENT_VIEW.TIMELINE}
      className={cn(
        "mfdi-content-view-switcher__tab",
        value === CONTENT_VIEW.TIMELINE && "is-active",
      )}
      onClick={() => onChange(CONTENT_VIEW.TIMELINE)}
    >
      タイムライン
    </button>
    <button
      type="button"
      role="tab"
      aria-selected={value === CONTENT_VIEW.INSIGHTS}
      className={cn(
        "mfdi-content-view-switcher__tab",
        value === CONTENT_VIEW.INSIGHTS && "is-active",
      )}
      onClick={() => onChange(CONTENT_VIEW.INSIGHTS)}
    >
      インサイト
    </button>
  </nav>
);
