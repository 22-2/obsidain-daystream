import { bindSearchDelegates } from "src/features/workspace/utils/searchDelegates";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("bindSearchDelegates", () => {
  type QuerySetter = ReturnType<typeof vi.fn> & ((query: string) => void);
  type OpenSetter = ReturnType<typeof vi.fn> & ((open: boolean) => void);
  type VoidSetter = ReturnType<typeof vi.fn> & (() => void);

  let setSearchQuery: QuerySetter;
  let setSearchInputOpen: OpenSetter;
  let openSearchInput: VoidSetter;
  let closeSearchInput: VoidSetter;

  beforeEach(() => {
    setSearchQuery = vi.fn() as QuerySetter;
    setSearchInputOpen = vi.fn() as OpenSetter;
    openSearchInput = vi.fn() as VoidSetter;
    closeSearchInput = vi.fn() as VoidSetter;
  });

  it("search input events and query changes are forwarded", () => {
    const view = {
      actionDelegates: {},
    } as Parameters<typeof bindSearchDelegates>[0];

    const cleanup = bindSearchDelegates(view, {
      setSearchQuery,
      setSearchInputOpen,
      openSearchInput,
      closeSearchInput,
    });

    view.actionDelegates.onSearchQueryChange?.("wanted");
    view.actionDelegates.onSearchInputOpen?.();
    view.actionDelegates.onSearchInputClose?.();

    expect(setSearchQuery).toHaveBeenCalledWith("wanted");
    expect(setSearchInputOpen).toHaveBeenNthCalledWith(1, true);
    expect(setSearchInputOpen).toHaveBeenNthCalledWith(2, false);
    expect(openSearchInput).toHaveBeenCalledTimes(1);
    expect(closeSearchInput).toHaveBeenCalledTimes(1);

    cleanup();
    expect(view.actionDelegates.onSearchQueryChange).toBeUndefined();
    expect(view.actionDelegates.onSearchInputOpen).toBeUndefined();
    expect(view.actionDelegates.onSearchInputClose).toBeUndefined();
  });
});
