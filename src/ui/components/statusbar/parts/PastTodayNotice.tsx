import type { FC } from "react";
import { ObsidianIcon } from "src/ui/components/common/ObsidianIcon";
import { Box } from "src/ui/components/primitives";
import { usePastTodayPostCount } from "src/ui/hooks/usePastTodayPostCount";

/** 現在の日付と同じ月日の過去投稿があることを一覧上部に知らせる。 */
export const PastTodayNotice: FC = () => {
  const { count, isLoading } = usePastTodayPostCount();

  if (isLoading || count === 0) return null;

  return (
    <Box
      role="status"
      aria-live="polite"
      className="mfdi-past-today-notice mx-auto my-1 flex w-[75%] max-w-[calc(100%_-_1rem)] items-center justify-between gap-2 rounded-[var(--radius-m)] border px-3 py-2 text-[length:var(--font-ui-smaller)] font-medium"
    >
      <Box as="span">過去の今日の投稿が{count}件あります</Box>
      <ObsidianIcon
        name="arrow-right"
        boxSize="1em"
        aria-hidden="true"
        className="shrink-0 cursor-default p-0 hover:text-inherit"
      />
    </Box>
  );
};
