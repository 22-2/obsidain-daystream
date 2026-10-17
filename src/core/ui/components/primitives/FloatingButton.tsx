import type { FC, MouseEventHandler, ReactNode } from "react";
import { cn } from "src/core/ui/components/primitives/utils";
import { useObsidianTooltip } from "src/core/ui/hooks/useObsidianTooltip";

// 目的: スクロールコンテナ内で右下に表示される「トップへ戻る」ボタンを提供する
// 意図: 単純な可視性制御（visible prop）とクリックでスクロール動作をトリガーするだけの小さなプリミティブ。
// 理由: コンポーネントを分離することで、他のリストや長いコンテンツにも再利用できるようにする
type FloatingButtonProps = {
  onClick?: MouseEventHandler<HTMLButtonElement>;
  tooltip?: string;
  visible?: boolean;
  className?: string;
  children?: ReactNode;
};

export const FloatingButton: FC<FloatingButtonProps> = ({
  onClick,
  tooltip,
  visible = true,
  className,
  children,
}) => {
  const tooltipRef = useObsidianTooltip(tooltip ?? "");
  if (!visible) return null;

  return (
    <button
      ref={tooltip ? tooltipRef : undefined}
      className={cn(
        "absolute right-8 bottom-8 z-20 bg-[var(--interactive-accent)] text-[var(--text-on-accent)] rounded-full p-3 shadow-lg hover:opacity-90 transition-opacity flex items-center justify-center",
        className ?? "",
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
};

Object.defineProperty(FloatingButton, "displayName", {
  value: "FloatingButton",
});
