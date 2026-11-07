// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MainViewTabs } from "src/features/workspace/components/layout/MainViewTabs";
import { MAIN_VIEW } from "src/features/workspace/config/constants";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

describe("MainViewTabs", () => {
  it("periodic view では検索を除く表示切替とボードをタブ列に表示する", () => {
    const onChange = vi.fn();
    const onSelectBoards = vi.fn();
    render(
      <MainViewTabs
        value={MAIN_VIEW.DATE}
        noteMode="periodic"
        onChange={onChange}
        onSelectBoards={onSelectBoards}
      />,
    );

    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "タイムライン",
      "日付",
      "ボード",
      "インサイト",
    ]);
    expect(screen.queryByRole("tab", { name: "検索" })).toBeNull();
    expect(screen.getByRole("tab", { name: "日付" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getAllByRole("tab")[0].textContent).toBe("タイムライン");
    fireEvent.click(screen.getByRole("tab", { name: "日付" }));
    expect(onChange).toHaveBeenCalledWith(MAIN_VIEW.DATE);
    fireEvent.click(screen.getByRole("tab", { name: "ボード" }));
    expect(onSelectBoards).toHaveBeenCalledTimes(1);
  });

  it("ボードを開いているときは全タブを出し、ボードだけを選択状態にする", () => {
    const onChange = vi.fn();
    const onSelectBoards = vi.fn();
    render(
      <MainViewTabs
        value={MAIN_VIEW.TIMELINE}
        noteMode="fixed"
        isBoard
        onChange={onChange}
        onSelectBoards={onSelectBoards}
      />,
    );

    const selected = screen
      .getAllByRole("tab")
      .filter((tab) => tab.getAttribute("aria-selected") === "true");
    expect(selected.map((tab) => tab.textContent)).toEqual(["ボード"]);

    fireEvent.click(screen.getByRole("tab", { name: "日付" }));
    expect(onChange).toHaveBeenCalledWith(MAIN_VIEW.DATE);
    // 意図: 開いているボードをもう一度押しても、ボードを開き直さない。
    fireEvent.click(screen.getByRole("tab", { name: "ボード" }));
    expect(onSelectBoards).not.toHaveBeenCalled();
  });

  it("fixed view ではタイムラインだけを表示する", () => {
    render(
      <MainViewTabs
        value={MAIN_VIEW.TIMELINE}
        noteMode="fixed"
        onChange={vi.fn()}
        onSelectBoards={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["タイムライン"]);
  });
});
