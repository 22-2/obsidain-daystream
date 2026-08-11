import { fetchPastTodayPostCount } from "src/ui/hooks/usePastTodayPostCount";
import { beforeEach, describe, expect, it, vi } from "vitest";

function createMemoRecord(id: string, createdAt: string, metadataJson = "{}") {
  return {
    id,
    path: `daily/${createdAt.slice(0, 10)}.md`,
    noteName: "daily note",
    topicId: "work",
    noteGranularity: "day" as const,
    content: id,
    tags: [],
    metadataJson,
    startOffset: 0,
    endOffset: 10,
    bodyStartOffset: 2,
    createdAt,
    noteDate: createdAt.slice(0, 10),
    updatedAt: createdAt,
    archived: 0 as const,
    deleted: 0 as const,
    pinned: 0 as const,
  };
}

describe("fetchPastTodayPostCount", () => {
  const getAllActiveDates = vi.fn<() => Promise<string[]>>();
  const getMemos = vi.fn();

  beforeEach(() => {
    getAllActiveDates.mockReset();
    getMemos.mockReset();
  });

  it("過去年の同じ月日のルート投稿だけをトピック別に数える", async () => {
    getAllActiveDates.mockResolvedValue(["2026-08-11", "2025-08-11", "2024-08-01"]);
    getMemos.mockImplementation(async ({ startDate, topicId }) => {
      expect(topicId).toBe("work");
      const year = window.moment(startDate).year();
      if (year === 2025) {
        return [
          createMemoRecord("root-2025", "2025-08-11T09:00:00.000Z"),
          createMemoRecord(
            "reply-2025",
            "2025-08-11T10:00:00.000Z",
            JSON.stringify({ mfdiId: "reply", parentId: "root-2025" }),
          ),
        ];
      }
      if (year === 2024) {
        return [createMemoRecord("root-2024", "2024-08-11T09:00:00.000Z")];
      }
      return [];
    });

    const count = await fetchPastTodayPostCount(
      { getAllActiveDates, getMemos },
      window.moment("2026-08-11T12:00:00.000Z"),
      "work",
    );

    expect(count).toBe(2);
    expect(getMemos).toHaveBeenCalledTimes(2);
  });

  it("2月29日はうるう年だけを取得する", async () => {
    getAllActiveDates.mockResolvedValue(["2024-02-29", "2023-02-28", "2022-02-01"]);
    getMemos.mockResolvedValue([createMemoRecord("leap-day", "2024-02-29T09:00:00.000Z")]);

    const count = await fetchPastTodayPostCount(
      { getAllActiveDates, getMemos },
      window.moment("2028-02-29T12:00:00.000Z"),
    );

    expect(count).toBe(1);
    expect(getMemos).toHaveBeenCalledTimes(1);
  });
});
