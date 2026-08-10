import type { MouseEventHandler, ReactNode } from "react";
import { cn } from "src/ui/components/primitives/utils";

// 目的: スクロールコンテナ内で右下に表示される「トップへ戻る」ボタンを提供する
// 意図: 単純な可視性制御（visible prop）とクリックでスクロール動作をトリガーするだけの小さなプリミティブ。
// 理由: コンポーネントを分離することで、他のリストや長いコンテンツにも再利用できるようにする
type FloatingButtonProps = {
  onClick?: MouseEventHandler<HTMLButtonElement>;
  visible?: boolean;
  ariaLabel?: string;
  className?: string;
  children?: ReactNode;
};

export const FloatingButton: React.FC<FloatingButtonProps> = ({
  onClick,
  visible = true,
  ariaLabel = "Scroll to top",
  className,
  children,
}) => {
  if (!visible) return null;

  return (
    <button
      aria-label={ariaLabel}
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
