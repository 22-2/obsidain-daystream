// @vitest-environment jsdom
import { parseThinoEntries } from "src/core/thino";
import { describe, expect, it } from "vitest";

describe("Post Offset Discovery", () => {
  it("should find the correct entry even if offsets have shifted", () => {
    // 1. Initial state
    const initialContent = `## Thino
- 10:00:00 post1
- 11:00:00 post2
`;
    const initialEntries = parseThinoEntries(initialContent);
    const post2 = initialEntries[1];
    expect(post2.time).toBe("11:00:00");
    expect(post2.startOffset).toBe(initialContent.indexOf("- 11:00:00"));

    // 2. Someone edits the file externally (e.g. adding text at the beginning)
    const shiftedContent = `## Thino
Added some text here that shifts everything down.
- 10:00:00 post1
- 11:00:00 post2
`;

    // 3. Try to find post2 in shifted content using the same logic as in usePostActions.ts
    const latestEntries = parseThinoEntries(shiftedContent);
    const targetTime = "11:00:00"; // from post2.timestamp.format("HH:mm:ss")
    const latestPost = latestEntries.find((e) => {
      return e.time.endsWith(targetTime) && e.message === post2.message;
    });

    expect(latestPost).toBeDefined();
    expect(latestPost?.startOffset).toBe(shiftedContent.indexOf("- 11:00:00"));
    expect(latestPost?.startOffset).not.toBe(post2.startOffset);
  });

  it("should handle multi-line messages and complex metadata correctly during re-discovery", () => {
    const content = `## Thino
  - 19:17:58 ggg (from 2026-03-10)
    multi-line body
    with some text
    [posted::2026-03-10T10:18:13.546Z]
`;
    const entries = parseThinoEntries(content);
    const post = entries[0];

    // Re-discovery logic
    const latestPost = entries.find((e) => {
      return e.time.endsWith("19:17:58") && e.message === post.message;
    });

    expect(latestPost).toBeDefined();
    expect(latestPost?.message).toContain("multi-line body");
    expect(latestPost?.metadata.posted).toBe("2026-03-10T10:18:13.546Z");
  });
});
