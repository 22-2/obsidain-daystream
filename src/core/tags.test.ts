import {
  isValidTagName,
  normalizeTags,
  parseDaystreamTags,
  serializeDaystreamTags,
  TAG_METADATA_KEY,
} from "src/core/tags";
import { describe, expect, test } from "vitest";

describe("tags helpers", () => {
  test("parseDaystreamTags parses comma-separated tags", () => {
    expect(parseDaystreamTags({ [TAG_METADATA_KEY]: "IT, Later" })).toEqual(["IT", "Later"]);
  });

  test("parseDaystreamTags returns empty for missing metadata", () => {
    expect(parseDaystreamTags({})).toEqual([]);
  });

  test("normalizeTags trims, deduplicates, and drops invalid tags", () => {
    expect(normalizeTags([" IT ", "Later", "IT", "", "bad,tag", "two\nlines"])).toEqual([
      "IT",
      "Later",
    ]);
  });

  test("serializeDaystreamTags writes normalized comma-separated tags", () => {
    expect(serializeDaystreamTags([" IT ", "Later", "IT"])).toBe("IT, Later");
  });

  test("isValidTagName rejects commas, closing brackets, and newlines", () => {
    expect(isValidTagName("valid-tag")).toBe(true);
    expect(isValidTagName("bad,tag")).toBe(false);
    expect(isValidTagName("bad]tag")).toBe(false);
    expect(isValidTagName("bad\ntag")).toBe(false);
  });
});
