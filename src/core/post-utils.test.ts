// @vitest-environment jsdom
import { toText } from "src/core/post-utils";
import { describe, expect, test } from "vitest";

// 現在時刻（2026-03-02T16:00:00+09:00）とタイムゾーン（Asia/Tokyo）は
// vitest.setup.ts / vitest.config.ts で固定している。期待値の日時表現はこれに依存する。

describe("toText", () => {
  test("thino format - day granularity uses only time", () => {
    const result = toText("test", false, "day");
    expect(result).toBe("- 16:00:00 test\n");
  });

  test("thino format - other granularity uses full date time", () => {
    const result = toText("test", false, "week");
    expect(result).toBe("- 2026-03-02 16:00:00 test\n");
  });

  test("task format - day granularity uses only time", () => {
    const result = toText("test", true, "day");
    expect(result).toBe("- [ ] 16:00:00 test\n");
  });

  test("task format - other granularity uses full date time", () => {
    const result = toText("test", true, "week");
    expect(result).toBe("- [ ] 2026-03-02 16:00:00 test\n");
  });

  test("thino format - with metadata", () => {
    const result = toText("test", false, "day", undefined, {
      other: "value",
    });
    expect(result).toBe("- 16:00:00 test\n    [other::value]\n");
  });

  test("thino format - should NOT filter hidden metadata", () => {
    const result = toText("test", false, "day", undefined, {
      archived: "true",
      deleted: "20260101000000",
      posted: "2026-03-10T19:00:00.00Z",
    });
    // archived and deleted should NOT be hidden
    expect(result).toBe(
      "- 16:00:00 test\n    [archived::true]\n    [deleted::20260101000000]\n    [posted::2026-03-10T19:00:00.00Z]\n",
    );
  });

  test("thino format - trims redundant empty lines", () => {
    const result = toText("test\n\n\n", false, "day");
    expect(result).toBe("- 16:00:00 test\n");
  });

  test("thino format - fenced code block starts on next indented line", () => {
    const result = toText(
      "```\nどす黒い作家性\n  ↓ 「これを人に伝えるには何の器が最適か」\n売れる公式（乗り物）を選ぶ\n  ↓\n作家性が公式の中で爆発する\n\n```",
      false,
      "day",
    );

    expect(result).toBe(
      "- 16:00:00\n    ```\n    どす黒い作家性\n      ↓ 「これを人に伝えるには何の器が最適か」\n    売れる公式（乗り物）を選ぶ\n      ↓\n    作家性が公式の中で爆発する\n\n    ```\n",
    );
  });

  test("thino format - fenced code block keeps metadata out of the head line", () => {
    const result = toText("```\ncode\n```", false, "day", undefined, {
      posted: "2026-03-10T10:18:13.546Z",
    });

    expect(result).toBe(
      "- 16:00:00\n    ```\n    code\n    ```\n    [posted::2026-03-10T10:18:13.546Z]\n",
    );
  });

  test("thino format - appends metadata at the end of the post", () => {
    const result = toText("ggg (from 2026-03-10)", false, "day", undefined, {
      posted: "2026-03-10T10:18:13.546Z",
    });
    expect(result).toBe(
      "- 16:00:00 ggg (from 2026-03-10)\n    [posted::2026-03-10T10:18:13.546Z]\n",
    );
  });

  test("thino format - multi-line with metadata", () => {
    const result = toText(
      "zustandを始めて使ったときは衝撃だったな\nむかしはcontextproviderの順番でやきもきしてたから",
      false,
      "day",
      undefined,
      {
        key1: "val1",
      },
    );
    expect(result).toBe(
      "- 16:00:00 zustandを始めて使ったときは衝撃だったな\n    むかしはcontextproviderの順番でやきもきしてたから\n    [key1::val1]\n",
    );
  });

  test("thino format - multiple metadata are written on separate lines", () => {
    const result = toText("test", false, "day", undefined, {
      parentId: "cc73160c",
      posted: "2026-03-10T10:18:13.546Z",
    });

    expect(result).toBe(
      "- 16:00:00 test\n    [parentId::cc73160c]\n    [posted::2026-03-10T10:18:13.546Z]\n",
    );
  });

  test("thino format - should NOT filter archived and deleted metadata", () => {
    const result = toText("test", false, "day", undefined, {
      archived: "20260311195539",
      deleted: "20260311195539",
    });
    expect(result).toContain("[archived::20260311195539]");
    expect(result).toContain("[deleted::20260311195539]");
  });

  test("thino format - appends blockId at the very end", () => {
    const result = toText("test", false, "day", undefined, {
      key: "val",
      blockId: "abc123",
    });
    expect(result).toBe("- 16:00:00 test\n    [key::val]\n    ^abc123\n");
  });

  test("thino format - appends blockId at the end even without other metadata", () => {
    const result = toText("test", false, "day", undefined, {
      blockId: "abc123",
    });
    expect(result).toBe("- 16:00:00 test\n    ^abc123\n");
  });
});
