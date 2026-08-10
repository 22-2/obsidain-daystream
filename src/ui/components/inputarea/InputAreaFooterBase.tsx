import { type FC, type ReactNode, memo } from "react";
import { Box, Button, HStack } from "src/ui/components/primitives";
import { cn } from "src/ui/components/primitives/utils";

interface InputAreaFooterBaseProps {
  canSubmit: boolean;
  submitLabel: ReactNode;
  submitAriaLabel?: string;
  onSubmit: () => void;
  leadingActions?: ReactNode;
  /** 指定された場合のみキャンセルボタンを表示する */
  onCancel?: () => void;
  cancelLabel?: string;
  /** 0 以下の場合は非表示 */
  characterCount: number;
  onSubmitContextMenu?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  className?: string;
  submitButtonClassName?: string;
  /** アクション群を左側へ寄せるかどうか */
  actionsPlacement?: "start" | "end";
  /** style タグの注入など、フッター内に追加する要素 */
  children?: ReactNode;
}

export const InputAreaFooterBase: FC<InputAreaFooterBaseProps> = memo(
  ({
    canSubmit,
    submitLabel,
    submitAriaLabel,
    onSubmit,
    leadingActions,
    onCancel,
    cancelLabel = "キャンセル",
    characterCount,
    onSubmitContextMenu,
    onClick,
    className = "",
    submitButtonClassName,
    actionsPlacement = "end",
    children,
  }) => {
    return (
      <HStack
        className={cn(
          "w-full items-center py-[0.5em] pb-[1em] px-[1.2em] gap-[0.5em]",
          actionsPlacement === "start" ? "justify-start" : "justify-between",
          className,
        )}
        onClick={onClick}
      >
        <Box className="flex items-center gap-[0.5em] min-w-0">
          {children}
          {leadingActions}
        </Box>

        <HStack className="items-center gap-[0.5em]">
          {actionsPlacement === "end" && characterCount > 0 && (
            <Box className="text-xs text-[var(--text-muted)]">
              {characterCount} chars
            </Box>
          )}

          {onCancel && (
            <Button className="h-[2.4em]" variant="ghost" onClick={onCancel}>
              {cancelLabel}
            </Button>
          )}

          <Button
            aria-label={submitAriaLabel}
            disabled={!canSubmit}
            className={cn(
              "h-[2.4em]",
              {
                "text-[var(--text-on-accent)]": canSubmit,
              },
              submitButtonClassName,
            )}
            variant="accent"
            onClick={onSubmit}
            onContextMenu={onSubmitContextMenu}
          >
            {submitLabel}
          </Button>

          {actionsPlacement === "start" && characterCount > 0 && (
            <Box className="text-xs text-[var(--text-muted)]">
              {characterCount} chars
            </Box>
          )}
        </HStack>
      </HStack>
    );
  },
);
