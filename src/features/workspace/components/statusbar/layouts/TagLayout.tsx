import type { FC } from "react";
import { Box } from "src/core/ui/components/primitives";
import { BaseLayout } from "src/features/workspace/components/statusbar/layouts/BaseLayout";
import { DateDisplay } from "src/features/workspace/components/statusbar/parts/DateDisplay";
import { ResultCount } from "src/features/workspace/components/statusbar/parts/ResultCount";
import { TopicDisplay } from "src/features/workspace/components/statusbar/parts/TopicDisplay";

export const TagLayout: FC = () => {
  return (
    <BaseLayout
      leftItems={<DateDisplay />}
      rightItems={
        <Box>
          <ResultCount />
          <TopicDisplay />
        </Box>
      }
    />
  );
};
