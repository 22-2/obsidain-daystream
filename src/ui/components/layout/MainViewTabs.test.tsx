// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MainViewTabs } from "src/ui/components/layout/MainViewTabs";
import { MAIN_VIEW } from "src/ui/config/consntants";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

describe("MainViewTabs", () => {
  it("periodic view の全メインビューを一つのタブ列に表示する", () => {
    const onChange = vi.fn();
    render(
      <MainViewTabs
        value={MAIN_VIEW.SEARCH}
        noteMode="periodic"
        onChange={onChange}
        onHome={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("tab")).toHaveLength(5);
    expect(screen.getByRole("tab", { name: "検索" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(screen.getByRole("tab", { name: "日付" }));
    expect(onChange).toHaveBeenCalledWith(MAIN_VIEW.DATE);
  });

  it("fixed view では利用可能なタイムラインと検索だけを表示する", () => {
    render(
      <MainViewTabs
        value={MAIN_VIEW.TIMELINE}
        noteMode="fixed"
        onChange={vi.fn()}
        onHome={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("tab").map((tab) => tab.getAttribute("aria-label"))).toEqual([
      "タイムライン",
      "検索",
    ]);
  });
});
