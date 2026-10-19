// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MainViewTabs } from "src/features/workspace/components/layout/MainViewTabs";
import { MAIN_VIEW } from "src/features/workspace/config/constants";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

describe("MainViewTabs", () => {
  it("periodic view では検索を除く表示切替をタブ列に表示する", () => {
    const onChange = vi.fn();
    render(<MainViewTabs value={MAIN_VIEW.DATE} noteMode="periodic" onChange={onChange} />);

    expect(screen.getAllByRole("tab")).toHaveLength(3);
    expect(screen.queryByRole("tab", { name: "検索" })).toBeNull();
    expect(screen.getByRole("tab", { name: "日付" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getAllByRole("tab")[0].textContent).toBe("タイムライン");
    fireEvent.click(screen.getByRole("tab", { name: "日付" }));
    expect(onChange).toHaveBeenCalledWith(MAIN_VIEW.DATE);
  });

  it("fixed view ではタイムラインだけを表示する", () => {
    render(<MainViewTabs value={MAIN_VIEW.TIMELINE} noteMode="fixed" onChange={vi.fn()} />);

    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["タイムライン"]);
  });
});
