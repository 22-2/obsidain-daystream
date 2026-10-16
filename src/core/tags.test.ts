import {
  isValidTagName,
  normalizeTags,
  parseDSTRTags,
  serializeDSTRTags,
  TAG_METADATA_KEY,
} from "src/core/tags";
import { describe, expect, test } from "vitest";

describe("tags helpers", () => {
  test("parseDSTRTags parses comma-separated tags", () => {
    expect(parseDSTRTags({ [TAG_METADATA_KEY]: "IT, Later" })).toEqual(["IT", "Later"]);
  });

  test("parseDSTRTags returns empty for missing metadata", () => {
    expect(parseDSTRTags({})).toEqual([]);
  });

  test("normalizeTags trims, deduplicates, and drops invalid tags", () => {
    expect(normalizeTags([" IT ", "Later", "IT", "", "bad,tag", "two\nlines"])).toEqual([
      "IT",
      "Later",
    ]);
  });

  test("serializeDSTRTags writes normalized comma-separated tags", () => {
    expect(serializeDSTRTags([" IT ", "Later", "IT"])).toBe("IT, Later");
  });

  test("isValidTagName rejects commas, closing brackets, and newlines", () => {
    expect(isValidTagName("valid-tag")).toBe(true);
    expect(isValidTagName("bad,tag")).toBe(false);
    expect(isValidTagName("bad]tag")).toBe(false);
    expect(isValidTagName("bad\ntag")).toBe(false);
  });
});
