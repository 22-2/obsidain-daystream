import { parseThinoEntries } from "src/core/thino";
import { describe, expect, test } from "vitest";

describe("parseThinoEntries", () => {
  test("parses entries under ## Thino", () => {
    const content = [
      "# Daily",
      "",
      "## Thino",
      "- 12:53:49",
      "    ワムウよりジョジョのほうが不快っすな・・・🥺",
      "    どう思うっすか？",
      "- 19:19:57 ",
      "    化物語ってなんか押し付けがましい気がするっすな",
      "",
      '    [物語シリーズの"幸せの強制"](https://example.com)',
      "",
      "## Another",
      "- 23:59:59",
      "    should not be parsed",
      "",
    ].join("\n");

    const entries = parseThinoEntries(content);
    expect(entries).toHaveLength(2);

    expect(entries[0].time).toBe("12:53:49");
    expect(entries[0].message).toBe(
      ["ワムウよりジョジョのほうが不快っすな・・・🥺", "どう思うっすか？"].join("\n"),
    );
    expect(entries[0].offset).toBe(content.indexOf("- 12:53:49"));
    expect(entries[0].startOffset).toBe(content.indexOf("- 12:53:49"));
    expect(entries[0].bodyStartOffset).toBe(
      content.indexOf("- 12:53:49") + "- 12:53:49".length + 1,
    );

    expect(entries[1].time).toBe("19:19:57");
    expect(entries[1].message).toBe(
      [
        "化物語ってなんか押し付けがましい気がするっすな",
        "",
        '[物語シリーズの"幸せの強制"](https://example.com)',
      ].join("\n"),
    );
    expect(entries[1].offset).toBe(content.indexOf("- 19:19:57"));
    expect(entries[1].startOffset).toBe(content.indexOf("- 19:19:57"));
    expect(entries[1].bodyStartOffset).toBe(
      content.indexOf("- 19:19:57") + "- 19:19:57 ".length + 1,
    );
  });

  test("handles inline time bullets and ignores task lines", () => {
    const content = [
      "# Daily",
      "",
      "## Thino",
      "- 13:45:12 ",
      "    asmrを聞くための睡眠用イヤホンで迷っているっす",
      "    無線は充電が切れてしまうからあんまり良くないと思っているんすよね",
      "    有線はすぐに片方が聞こえなくなってしまうっす🥺",
      "    どうしたらいいんすかね🥺",
      "    [asmrを聞くための睡眠用イヤホンで迷っているっす 無線は充電が切れてしまうからあんまり良くないと思っているんすよね 有線はすぐに片方が聞こえなくなってしまうっ...](https://www.perplexity.ai/search/asmrwowen-kutamenoshui-mian-yo-TQqJcldASr.KbxPsehohgQ)",
      "- 17:41:29 てすこ",
      "- [ ] 17:41:40 てすこら",
      "",
    ].join("\n");

    const entries = parseThinoEntries(content);
    // Checkbox-style lines should be ignored by Thino parser (handled as tasks elsewhere).
    expect(entries).toHaveLength(2);
    expect(entries[0].time).toBe("13:45:12");
    expect(entries[1].time).toBe("17:41:29");
  });

  test("treats inline time + checkbox line as single post", () => {
    const content = [
      "# Daily",
      "",
      "## Thino",
      "- 17:41:29",
      "    aaa",
      "    aaa",
      "    aaa",
      "- 17:41:29 てすこ",
      "- [ ] 17:41:40 てすこら ",
      "",
    ].join("\n");

    const entries = parseThinoEntries(content);
    // Checkbox line should NOT be parsed as Thino entry; expect two entries.
    expect(entries).toHaveLength(2);
    expect(entries[0].time).toBe("17:41:29");
    expect(entries[0].message).toBe(["aaa", "aaa", "aaa"].join("\n"));
    expect(entries[1].time).toBe("17:41:29");
    expect(entries[1].message).toBe("てすこ");
  });

  test("returns empty when no Thino heading", () => {
    expect(parseThinoEntries("## NotThino\n- 12:00:00\n    hi")).toEqual([]);
  });

  test("parses metadata and trims message", () => {
    const content = [
      "## Thino",
      "- 19:03:56 aaa [archived::true]",
      "- 19:04:27 test [deleted::20260310190431]",
      "- 19:05:23 ",
      "    test",
      "    test",
      "    test",
      "    test [deleted::20260310190539]",
      "",
    ].join("\n");

    const entries = parseThinoEntries(content);
    expect(entries).toHaveLength(3);

    expect(entries[0].message).toBe("aaa");
    expect(entries[0].metadata).toEqual({ archived: "true" });

    expect(entries[1].message).toBe("test");
    expect(entries[1].metadata).toEqual({ deleted: "20260310190431" });

    expect(entries[2].message).toBe("test\ntest\ntest\ntest");
    expect(entries[2].metadata).toEqual({ deleted: "20260310190539" });
  });

  test("parses metadata and message with (from date) correctly", () => {
    const content = `## Thino
- 19:17:58 ggg (from 2026-03-10)
    [posted::2026-03-10T10:18:13.546Z]
`;
    const entries = parseThinoEntries(content);
    expect(entries).toHaveLength(1);
    expect(entries[0].message).toBe("ggg (from 2026-03-10)");
    expect(entries[0].metadata.posted).toBe("2026-03-10T10:18:13.546Z");
  });

  test("resolves timestamp from posted metadata", () => {
    const iso = "2026-03-10T19:00:00.000Z";
    const content = `## Thino\n- 10:00:00 test\n    [posted::${iso}]`;
    const entries = parseThinoEntries(content);
    expect(entries[0].metadata.posted).toBe(iso);
  });

  test("does not split body lines that look like thino entries", () => {
    const content = [
      "## Thino",
      "- 09:00:00 ```",
      "    - 23:59:59 launcher以下の処理フローを大幅に簡素化したいっす",
      "        処理の安定化",
      "        レートリミット対策",
      "        セットアップの簡素化",
      "        [parentId::284bbb4e]",
      "        [posted::2026-03-19T02:55:45.026Z]",
      "    - 23:59:59 省略の閾値を設定可能に",
      "        [parentId::284bbb4e]",
      "        [posted::2026-03-19T02:09:17.340Z]",
      "    - 23:59:59 セットアップが複雑",
      "        レートリミットに引っかかりがち",
      "",
      "        受け入れ条件",
      "        example/on-demand-pluings/以下のテストが動く",
      "        [parentId::284bbb4e]",
      "        [posted::2026-03-19T01:29:44.404Z]",
      "    ```",
      "    [posted::2026-03-19T09:00:00.000Z]",
    ].join("\n");

    const entries = parseThinoEntries(content);

    expect(entries).toHaveLength(1);
    expect(entries[0].message).toContain(
      "- 23:59:59 launcher以下の処理フローを大幅に簡素化したいっす",
    );
    expect(entries[0].message).toContain("- 23:59:59 省略の閾値を設定可能に");
    expect(entries[0].message).toContain("[parentId::284bbb4e]");
    expect(entries[0].metadata).toEqual({
      posted: "2026-03-19T09:00:00.000Z",
    });
  });

  test("keeps metadata-like tokens inside fenced code blocks as message text", () => {
    const content = [
      "## Thino",
      "- 10:00:00 ```ts",
      "    const sample = [",
      '    "[parentId::keep-me]",',
      '    "[posted::keep-me-too]",',
      "    ];",
      "    ```",
      "    [posted::2026-03-19T10:00:00.000Z]",
    ].join("\n");

    const entries = parseThinoEntries(content);

    expect(entries).toHaveLength(1);
    expect(entries[0].message).toContain("[parentId::keep-me]");
    expect(entries[0].message).toContain("[posted::keep-me-too]");
    expect(entries[0].metadata.posted).toBe("2026-03-19T10:00:00.000Z");
  });

  test("parses block ID and metadata in various orders", () => {
    const content = [
      "## Thino",
      "- 10:00:00 block id at end [key::val] ^abc123",
      "- 10:01:00 block id before metadata ^def456 [key::val]",
      "- 10:02:00 block id on separate line",
      "    content",
      "    [key::val]",
      "    ^ghi789",
      "",
    ].join("\n");

    const entries = parseThinoEntries(content);
    expect(entries).toHaveLength(3);

    expect(entries[0].message).toBe("block id at end");
    expect(entries[0].metadata).toEqual({ key: "val", blockId: "abc123" });

    expect(entries[1].message).toBe("block id before metadata");
    expect(entries[1].metadata).toEqual({ key: "val", blockId: "def456" });

    expect(entries[2].message).toBe("block id on separate line\ncontent");
    expect(entries[2].metadata).toEqual({ key: "val", blockId: "ghi789" });
  });
});
