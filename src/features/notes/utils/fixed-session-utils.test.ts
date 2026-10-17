import { obsidianMoment } from "src/core/platform/obsidian-globals";
import {
  groupSessionsByActivity,
  type FixedSessionSummary,
} from "src/features/notes/utils/fixed-session-utils";
import { describe, expect, it } from "vitest";

function session(
  sessionNumber: number,
  overrides: Partial<FixedSessionSummary> = {},
): FixedSessionSummary {
  return {
    sessionNumber,
    title: `Session ${sessionNumber}`,
    postCount: 0,
    createdAt: null,
    lastActiveAt: null,
    pinned: false,
    ...overrides,
  };
}

describe("groupSessionsByActivity", () => {
  it("ちょうど7日前は最近のグループ、その1ミリ秒前は古いグループに入る", () => {
    // 意図: 日単位への丸めで境界が変わらないよう、同じ時刻からの7日間を検証する。
    const threshold = obsidianMoment().subtract(7, "days");
    const onBoundary = session(1, { lastActiveAt: threshold.toISOString() });
    const beforeBoundary = session(2, {
      lastActiveAt: threshold.clone().subtract(1, "millisecond").toISOString(),
    });

    const grouped = groupSessionsByActivity([onBoundary, beforeBoundary]);

    expect(grouped.last7Days).toEqual([onBoundary]);
    expect(grouped.older).toEqual([beforeBoundary]);
    expect(grouped.pinned).toEqual([]);
  });

  it("活動日時がなくても、不正な日時でも古いグループに入る", () => {
    const withoutActivity = session(1, { createdAt: obsidianMoment().toISOString() });
    const invalidActivity = session(2, { lastActiveAt: "2026-13-01T00:00:00.000Z" });

    const grouped = groupSessionsByActivity([invalidActivity, withoutActivity]);

    expect(grouped.older).toEqual([withoutActivity, invalidActivity]);
    expect(grouped.last7Days).toEqual([]);
  });

  it("古いセッションでもピン留めなら専用グループだけに入る", () => {
    const pinned = session(1, {
      pinned: true,
      lastActiveAt: obsidianMoment().subtract(30, "days").toISOString(),
    });
    const recent = session(2, { lastActiveAt: obsidianMoment().toISOString() });

    const grouped = groupSessionsByActivity([recent, pinned]);

    expect(grouped.pinned).toEqual([pinned]);
    expect(grouped.last7Days).toEqual([recent]);
    expect(grouped.older).toEqual([]);
  });

  it("活動時刻が更新されても作成日時の新しい順を維持し、同時刻なら番号順に並ぶ", () => {
    const createdAt = obsidianMoment().subtract(2, "days").toISOString();
    const older = session(1, {
      createdAt: obsidianMoment().subtract(5, "days").toISOString(),
      lastActiveAt: obsidianMoment().toISOString(),
    });
    const newerFirst = session(2, { createdAt, lastActiveAt: createdAt });
    const newerSecond = session(3, { createdAt, lastActiveAt: createdAt });
    const original = [newerSecond, older, newerFirst];
    const input = [...original];

    const grouped = groupSessionsByActivity(input);

    expect(grouped.last7Days).toEqual([newerFirst, newerSecond, older]);
    expect(input).toEqual(original);
  });
});
