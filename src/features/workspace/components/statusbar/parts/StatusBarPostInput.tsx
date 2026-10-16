import type { FC } from "react";
import { ObsidianIcon } from "src/core/ui/components/common/ObsidianIcon";
import { Input } from "src/core/ui/components/primitives";
import { PLACEHOLDER_TEXT } from "src/features/workspace/config/constants";
import { usePostComposer } from "src/features/composer/hooks/usePostComposer";

/** ツールバーから投稿入力画面を開くプレースホルダー。 */
export const StatusBarPostInput: FC = () => {
  const { isReadOnly, openComposer } = usePostComposer();

  if (isReadOnly) return null;

  return (
    <div
      className="daystream-statusbar-post-input flex min-h-10 w-full cursor-pointer items-center gap-1 rounded-[var(--radius-s)] border border-[var(--background-modifier-border)] bg-transparent px-1 transition-colors hover:bg-[var(--background-modifier-hover)]"
      onClick={openComposer}
    >
      <ObsidianIcon
        name="pencil"
        size="14px"
        className="pointer-events-none h-4 w-4 shrink-0 p-0 text-[var(--text-muted)] hover:text-[var(--text-muted)]"
      />
      <Input
        readOnly
        type="text"
        placeholder={PLACEHOLDER_TEXT}
        className="!h-auto min-h-8 min-w-0 flex-1 cursor-pointer border-0 bg-transparent px-0 py-0 text-[length:var(--font-ui-smaller)] text-[var(--text-normal)] shadow-none placeholder:text-[var(--text-muted)] focus:ring-0"
      />
    </div>
  );
};
