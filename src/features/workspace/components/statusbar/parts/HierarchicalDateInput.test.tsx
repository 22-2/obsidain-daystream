import { obsidianMoment } from "src/core/platform/obsidian-globals";
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { HierarchicalDateInput } from "src/features/workspace/components/statusbar/parts/HierarchicalDateInput";
import { AppStoreProvider, createAppStore } from "src/features/workspace/store/appStore";
import { afterEach, describe, expect, it } from "vitest";

afterEach(cleanup);

describe("HierarchicalDateInput", () => {
  it("年・月・日を独立して変更し、ほかの選択を保持する", () => {
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
    expect(store.getState().date.format("YYYY-MM-DD")).toBe("2027-03-19");
    expect(store.getState().dateSelection).toEqual({ year: 2027, month: 3, day: 19 });
    expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "月" }).value).toBe("3");
    expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "日" }).value).toBe("19");

    fireEvent.change(screen.getByRole("combobox", { name: "月" }), {
      target: { value: "4" },
    });
    expect(store.getState().date.format("YYYY-MM-DD")).toBe("2027-04-19");
    expect(store.getState().dateSelection).toEqual({ year: 2027, month: 4, day: 19 });
    expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "日" }).value).toBe("19");

    fireEvent.change(screen.getByRole("combobox", { name: "日" }), {
      target: { value: "19" },
    });
    expect(store.getState().date.format("YYYY-MM-DD")).toBe("2027-04-19");
    expect(store.getState().granularity).toBe("day");
  });
  it("年・月を空欄にしても日を保持し、各項目を独立して選べる", () => {
    const store = createAppStore();
    store.getState().setDate(obsidianMoment("2026-10-19"));
    render(<AppStoreProvider store={store}><HierarchicalDateInput /></AppStoreProvider>);
    const year = screen.getByRole("spinbutton", { name: "年" });
    const month = screen.getByRole<HTMLSelectElement>("combobox", { name: "月" });
    const day = screen.getByRole<HTMLSelectElement>("combobox", { name: "日" });

    fireEvent.change(year, { target: { value: "" } });
    expect(store.getState().dateSelection).toEqual({ year: null, month: 10, day: 19 });
    expect(month.disabled).toBe(false);
    expect(day.disabled).toBe(false);
    fireEvent.change(month, { target: { value: "" } });
    expect(day.value).toBe("19");
    expect(store.getState().dateSelection).toEqual({ year: null, month: null, day: 19 });
    fireEvent.change(month, { target: { value: "10" } });
    fireEvent.change(day, { target: { value: "" } });
    expect(store.getState().dateSelection).toEqual({ year: null, month: 10, day: null });
    fireEvent.change(month, { target: { value: "" } });
    expect(store.getState().dateSelection).toEqual({ year: null, month: null, day: null });
  });

  it("年未指定の2月29日を選べる", () => {
    const store = createAppStore();
    store.getState().setDateSelection({ year: null, month: 2, day: null });
    render(<AppStoreProvider store={store}><HierarchicalDateInput /></AppStoreProvider>);
    const day = screen.getByRole<HTMLSelectElement>("combobox", { name: "日" });
    fireEvent.change(day, { target: { value: "29" } });
    expect(day.value).toBe("29");
    expect(store.getState().dateSelection).toEqual({ year: null, month: 2, day: 29 });
  });

});
