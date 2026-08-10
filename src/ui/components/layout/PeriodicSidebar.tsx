import { useState } from "react";
import { MiniCalendar } from "src/ui/components/calendar/MiniCalendar";
import { SidebarScales } from "src/ui/components/layout/SidebarScales";
import { TagList } from "src/ui/components/layout/TagList";
import { VStack } from "src/ui/components/primitives";

export const PeriodicSidebar: React.FC = () => {
  const [sideBarViewDate, setSideBarViewDate] = useState(() => window.moment());

  return (
    <VStack className="h-full w-full items-stretch gap-0 overflow-y-auto">
      <MiniCalendar onViewDateChange={setSideBarViewDate} />
      <TagList />
      <SidebarScales
        viewedDate={sideBarViewDate}
        onViewDateChange={setSideBarViewDate}
      />
    </VStack>
  );
};
