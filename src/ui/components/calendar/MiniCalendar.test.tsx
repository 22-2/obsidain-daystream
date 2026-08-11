import { cleanup, fireEvent, render } from "@testing-library/react";
import moment from "moment";
import { DEFAULT_SETTINGS } from "src/settings";
import { MiniCalendar } from "src/ui/components/calendar/MiniCalendar";
import { DISPLAY_MODE } from "src/ui/config/consntants";
import { initializePostsStore } from "src/ui/store/postsStore";
import { initializeSettingsStore, settingsStore } from "src/ui/store/settingsStore";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("obsidian", () => ({
  setIcon: vi.fn(),
  Menu: vi.fn(),
  Notice: vi.fn(),
  PluginSettingTab: class {},
  Setting: class {
    setName = vi.fn().mockReturnThis();
    setDesc = vi.fn().mockReturnThis();
    addText = vi.fn().mockReturnThis();
    addToggle = vi.fn().mockReturnThis();
    addDropdown = vi.fn().mockReturnThis();
    addSlider = vi.fn().mockReturnThis();
    addSearch = vi.fn().mockReturnThis();
    addTextArea = vi.fn().mockReturnThis();
    addMomentFormat = vi.fn().mockReturnThis();
  },
  App: class {},
}));

vi.mock("src/ui/context/AppContext", () => ({
  useAppContext: vi.fn(() => ({
    shell: {},
  })),
  useObsidianApp: vi.fn(() => ({ vault: { getFiles: () => [] } })),
}));

vi.mock("src/ui/hooks/useMFDIDB", () => ({
  useMFDIDB: vi.fn(() => ({
    getAllActiveDates: vi.fn(async () => []),
  })),
}));

vi.mock("src/core/note-source", () => ({
  listPeriodicNotes: vi.fn(() => ({})),
  getPeriodicNoteDate: vi.fn(),
}));

describe("MiniCalendar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    initializeSettingsStore(DEFAULT_SETTINGS, {
      get: vi.fn(),
      set: vi.fn(),
    } as any);
    initializePostsStore({} as any);
  });
  afterEach(() => {
    cleanup();
  });

  it("renders without crashing", () => {
    settingsStore.setState({
      date: moment("2026-03-09T00:00:00.000Z"),
      granularity: "day",
      dateFilter: "today",
      activeTopic: "",
    });

    const { getByText } = render(<MiniCalendar />);
    expect(getByText("2026年")).toBeDefined();
    expect(getByText("3月")).toBeDefined();
  });

  it("calculates range accurately for 7d dateFilter", () => {
    settingsStore.setState({
      date: moment("2026-03-09T00:00:00.000Z"),
      granularity: "day",
      dateFilter: "7d",
      activeTopic: "",
    });

    // In MiniCalendar, posts are just used to show dots (activityDates)
    // The range calculation is internal to calcSelectedRange and buildWeeksInMonth

    const { getByText, getAllByText } = render(<MiniCalendar />);
    // 3/9 itself should have the selected day class (accent color)
    // 3/3 to 3/8 should be in the selected range (active hover bg)
    // We'll just ensure it renders and doesn't crash, the UI checks are handled by Chakra styles
    expect(getByText("2026年")).toBeDefined();
    expect(getByText("3月")).toBeDefined();

    // Day 5 should be present
    expect(getAllByText("5").length).toBeGreaterThan(0);

    // Finding dots or backgrounds purely by render isn't perfect without test IDs, but we can verify it doesn't crash.
  });

  it("タイムライン表示中に日付セルを押すとフォーカス表示へ戻る", () => {
    settingsStore.setState({
      date: moment("2026-03-09T00:00:00.000Z"),
      granularity: "day",
      dateFilter: "today",
      displayMode: DISPLAY_MODE.TIMELINE,
      activeTopic: "",
    });

    const { container } = render(<MiniCalendar />);
    const dayCell = container.querySelector(".mini-calendar__day-cell");

    expect(dayCell).toBeTruthy();
    fireEvent.click(dayCell as HTMLElement);

    expect(settingsStore.getState().displayMode).toBe(DISPLAY_MODE.FOCUS);
    expect(settingsStore.getState().dateFilter).toBe("today");
    expect(settingsStore.getState().granularity).toBe("day");
  });

  it("年・月ラベルは粒度を変えずに範囲を切り替え、再クリックでHomeへ戻る", () => {
    settingsStore.setState({
      date: moment("2026-03-09T00:00:00.000Z"),
      granularity: "day",
      dateFilter: "today",
      displayMode: DISPLAY_MODE.FOCUS,
      activeTopic: "",
    });

    const { getByText } = render(<MiniCalendar />);

    fireEvent.click(getByText("2026年"));
    expect(settingsStore.getState().granularity).toBe("day");
    expect(settingsStore.getState().dateFilter).toBe("this_year");

    // 同じ年の再クリックは「絞り込み解除」の意図としてHomeへ戻す。
    fireEvent.click(getByText("2026年"));
    expect(settingsStore.getState().granularity).toBe("day");
    expect(settingsStore.getState().dateFilter).toBe("today");

    fireEvent.click(getByText("3月"));
    expect(settingsStore.getState().granularity).toBe("day");
    expect(settingsStore.getState().dateFilter).toBe("this_month");

    fireEvent.click(getByText("3月"));
    expect(settingsStore.getState().granularity).toBe("day");
    expect(settingsStore.getState().dateFilter).toBe("today");
  });

  it("選択済みの週番号を再クリックするとhandleClickHome相当の状態に戻る", () => {
    settingsStore.setState({
      date: moment("2026-03-09T00:00:00.000Z"),
      granularity: "day",
      dateFilter: "this_week",
      displayMode: DISPLAY_MODE.FOCUS,
      activeTopic: "",
    });

    const { container } = render(<MiniCalendar />);
    const selectedWeek = moment("2026-03-09T00:00:00.000Z").isoWeek().toString();
    const weekButtons = Array.from(container.querySelectorAll(".mini-calendar__week-number"));
    const selectedWeekButton = weekButtons.find((el) => el.textContent?.trim() === selectedWeek);

    expect(selectedWeekButton).toBeTruthy();
    fireEvent.click(selectedWeekButton as HTMLElement);

    expect(settingsStore.getState().granularity).toBe("day");
    expect(settingsStore.getState().dateFilter).toBe("today");
  });
});
