import { obsidianMoment } from "src/core/platform/obsidian-globals";
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { HierarchicalDateInput } from "src/features/workspace/components/statusbar/parts/HierarchicalDateInput";
import { AppStoreProvider, createAppStore } from "src/features/workspace/store/appStore";
import { afterEach, describe, expect, it } from "vitest";

afterEach(cleanup);

describe("HierarchicalDateInput", () => {
  it("年・月・日を選んだ直後に期間を切り替え、未選択の下位項目を空欄にする", () => {
    const store = createAppStore();
    store.getState().setDate(obsidianMoment("2026-03-19"));
    render(
      <AppStoreProvider store={store}>
        <HierarchicalDateInput />
      </AppStoreProvider>,
    );

    fireEvent.change(screen.getByRole("spinbutton", { name: "年" }), {
      target: { value: "2027" },
    });
    expect(store.getState().date.format("YYYY-MM-DD")).toBe("2027-01-01");
    expect(store.getState().granularity).toBe("year");
    expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "月" }).value).toBe("");
    expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "日" }).value).toBe("");

    fireEvent.change(screen.getByRole("combobox", { name: "月" }), {
      target: { value: "4" },
    });
    expect(store.getState().date.format("YYYY-MM-DD")).toBe("2027-04-01");
    expect(store.getState().granularity).toBe("month");
    expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "日" }).value).toBe("");

    fireEvent.change(screen.getByRole("combobox", { name: "日" }), {
      target: { value: "19" },
    });
    expect(store.getState().date.format("YYYY-MM-DD")).toBe("2027-04-19");
    expect(store.getState().granularity).toBe("day");
  });
});
