import { buildMemoRecordsForNote } from "src/db/scan-note";
import { describe, expect, test } from "vitest";

describe("buildMemoRecordsForNote", () => {
  test("builds memo records with tags and metadata flags", () => {
    const records = buildMemoRecordsForNote({
      path: "daily/2026-03-23.md",
      noteName: "2026-03-23",
      topicId: "",
      noteGranularity: "day",
      noteDate: "2026-03-23T00:00:00.000Z",
      content: [
        "## Thino",
        "- 10:00:00 hello",
        "    [mfditags::IT, Later]",
        "- 11:00:00 hidden",
        "    [archived::true]",
      ].join("\n"),
    });

    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({
      path: "daily/2026-03-23.md",
      noteName: "2026-03-23",
      topicId: "",
      noteGranularity: "day",
      content: "hello",
      tags: ["IT", "Later"],
      archived: 0,
      deleted: 0,
      pinned: 0,
    });
    expect(records[1]).toMatchObject({
      content: "hidden",
      archived: 1,
      pinned: 0,
    });
  });

  test("pinned メタデータを DB レコードへ投影する", () => {
    const records = buildMemoRecordsForNote({
      path: "daily/2026-03-23.md",
      noteName: "2026-03-23",
      topicId: "",
      noteGranularity: "day",
      noteDate: "2026-03-23T00:00:00.000Z",
      content: ["## Thino", "- 10:00:00 hello [pinned::1]"].join("\n"),
    });

    expect(records[0]?.pinned).toBe(1);
  });

  test("prefers posted metadata over note date and time", () => {
    const records = buildMemoRecordsForNote({
      path: "daily/2026-03-23.md",
      noteName: "2026-03-23",
      topicId: "",
      noteGranularity: "day",
      noteDate: "2026-03-23T00:00:00.000Z",
      content: ["## Thino", "- 10:00:00 hello", "    [posted::2026-03-24T08:00:00.000Z]"].join(
        "\n",
      ),
    });

    expect(records[0]?.createdAt).toBe("2026-03-24T08:00:00.000Z");
  });
});
