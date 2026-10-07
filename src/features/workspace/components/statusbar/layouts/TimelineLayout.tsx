import type { FC } from "react";
import { BaseLayout } from "src/features/workspace/components/statusbar/layouts/BaseLayout";
import { ResultCount } from "src/features/workspace/components/statusbar/parts/ResultCount";
import { TopicDisplay } from "src/features/workspace/components/statusbar/parts/TopicDisplay";

export const TimelineLayout: FC = () => {
  return (
    <BaseLayout
      className="timeline-layout"
      leftItems={null}
      rightItems={
        <>
          <ResultCount />
          <TopicDisplay />
        </>
      }
    />
  );
};
