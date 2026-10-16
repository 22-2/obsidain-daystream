import type { DSTRView } from "src/features/workspace/views/DSTRView";

export function bindSearchDelegates(
  view: DSTRView,
  actionDelegates: {
    setSearchQuery: (query: string) => void;
    setSearchInputOpen: (open: boolean) => void;
    openSearchInput: () => void;
    closeSearchInput: () => void;
  },
): () => void {
  view.actionDelegates.onSearchQueryChange = (query: string) => {
    actionDelegates.setSearchQuery(query);
  };
  view.actionDelegates.onSearchInputOpen = () => {
    actionDelegates.setSearchInputOpen(true);
    actionDelegates.openSearchInput();
  };
  view.actionDelegates.onSearchInputClose = () => {
    actionDelegates.setSearchInputOpen(false);
    actionDelegates.closeSearchInput();
  };

  return () => {
    view.actionDelegates.onSearchQueryChange = undefined;
    view.actionDelegates.onSearchInputOpen = undefined;
    view.actionDelegates.onSearchInputClose = undefined;
  };
}
