import { useObsidianComponent } from "src/core/ui/context/ComponentContext";
import { isDSTRView } from "src/features/workspace/views/is-dstr-view";

export function useDSTRView() {
  return useObsidianComponent(isDSTRView);
}
