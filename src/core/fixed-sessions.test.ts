import { ensureFixedSessionHeading, parseFixedSessionSections } from "src/core/fixed-sessions";
import { describe, expect, it } from "vitest";

describe("fixed sessions", () => {
  it("legacy heading を session 1 として解釈する", () => {
    const content = [
      "# Note",
      "",
      "## Thino",
      "- 09:00:00 first",
      "",
      "## Thino session 2",
      "- 10:00:00 second",
    ].join("\n");

    const sections = parseFixedSessionSections(content, "## Thino");

    expect(sections).toHaveLength(2);
    expect(sections[0]).toMatchObject({
      sessionNumber: 1,
      isLegacyHeading: true,
    });
    expect(sections[0]?.entries[0]?.message).toBe("first");
    expect(sections[1]).toMatchObject({
      sessionNumber: 2,
      isLegacyHeading: false,
    });
    expect(sections[1]?.entries[0]?.message).toBe("second");
  });

  it("新しい session を作ると session 1 見出しも明示する", () => {
    const content = "";

    const result = ensureFixedSessionHeading({
      content,
      insertAfter: "## Thino",
      sessionNumber: 2,
    });

    expect(result.headingLine).toBe("## Thino session 2");
    expect(result.nextContent).toBe(
      ["## Thino session 1", "", "## Thino session 2", ""].join("\n"),
    );
  });

  it("legacy session 1 見出しは書き込み前に明示形へ昇格する", () => {
    const content = ["## Thino", "- 09:00:00 first"].join("\n");

    const result = ensureFixedSessionHeading({
      content,
      insertAfter: "## Thino",
      sessionNumber: 1,
    });

    expect(result.headingLine).toBe("## Thino session 1");
    expect(result.nextContent).toContain("## Thino session 1");
    expect(result.nextContent).not.toContain("## Thino\n");
  });
});
