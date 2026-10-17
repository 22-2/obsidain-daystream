import {
  getRecentErrorReports,
  reportError,
  resetErrorReportsForTesting,
} from "src/core/error-report";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  Notice: vi.fn<(message: string, timeout?: number) => void>(),
  logError: vi.fn<(...args: unknown[]) => void>(),
}));

vi.mock("src/core/logger", () => ({
  createLogger: () => ({ error: mocks.logError }),
}));

vi.mock("obsidian", async (importOriginal) => ({
  ...(await importOriginal<typeof import("obsidian")>()),
  Notice: mocks.Notice,
}));

describe("reportError", () => {
  beforeEach(() => {
    resetErrorReportsForTesting();
    mocks.Notice.mockClear();
  });

  it("エラーの内容と付帯情報をログと記録に残す", () => {
    const error = new Error("disk full");
    reportError({ context: "Failed to save", error, details: { path: "a.md" } });

    expect(mocks.logError).toHaveBeenCalledWith("Failed to save:", error, { path: "a.md" });

    expect(getRecentErrorReports()).toEqual([
      expect.objectContaining({
        context: "Failed to save",
        message: "disk full",
        details: { path: "a.md" },
      }),
    ]);
    expect(getRecentErrorReports()[0]?.stack).toContain("disk full");
  });

  it("Error 以外の値も文字列化して記録する", () => {
    reportError({ context: "Failed", error: "plain reason" });

    expect(getRecentErrorReports()[0]).toMatchObject({ message: "plain reason", stack: undefined });
  });

  it("notice を渡したときだけ原因付きで通知する", () => {
    reportError({ context: "log only", error: new Error("x") });
    expect(mocks.Notice).not.toHaveBeenCalled();

    reportError({ context: "notify", error: new Error("timeout"), notice: "保存できませんでした" });
    expect(mocks.Notice).toHaveBeenCalledTimes(1);
    const [message] = mocks.Notice.mock.calls[0];
    expect(message).toContain("保存できませんでした");
    expect(message).toContain("原因: timeout");
  });

  it("同じ通知は一定時間内に繰り返さないが、記録は残す", () => {
    reportError({ context: "a", error: new Error("1"), notice: "反映できませんでした" });
    reportError({ context: "a", error: new Error("2"), notice: "反映できませんでした" });
    expect(mocks.Notice).toHaveBeenCalledTimes(1);
    expect(getRecentErrorReports()).toHaveLength(2);

    vi.advanceTimersByTime(10_000);
    reportError({ context: "a", error: new Error("3"), notice: "反映できませんでした" });
    expect(mocks.Notice).toHaveBeenCalledTimes(2);
  });

  it("記録は直近 20 件だけを保持する", () => {
    for (let i = 0; i < 25; i += 1) reportError({ context: "c" + i, error: new Error(String(i)) });

    const reports = getRecentErrorReports();
    expect(reports).toHaveLength(20);
    expect(reports[0]?.context).toBe("c5");
    expect(reports.at(-1)?.context).toBe("c24");
  });
});
