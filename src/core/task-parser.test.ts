import { parseTaskTimestamp } from "src/core/task-parser";
import { describe, expect, test } from "vitest";

describe("parseTaskTimestamp", () => {
  const fileBasename = "2026-03-08";

  test("extracts time and combines with file date", () => {
    const { displayName, timestamp } = parseTaskTimestamp("16:37:23 My Task", fileBasename);
    expect(displayName).toBe("My Task");
    expect(timestamp.format("YYYY-MM-DD HH:mm:ss")).toBe("2026-03-08 16:37:23");
  });

  test("extracts full date-time", () => {
    const { displayName, timestamp } = parseTaskTimestamp(
      "2026-01-01 10:00:00 External Task",
      fileBasename,
    );
    expect(displayName).toBe("External Task");
    expect(timestamp.format("YYYY-MM-DD HH:mm:ss")).toBe("2026-01-01 10:00:00");
  });

  test("falls back to file date if no time in text", () => {
    const { displayName, timestamp } = parseTaskTimestamp("Simple Task", fileBasename);
    expect(displayName).toBe("Simple Task");
    expect(timestamp.format("YYYY-MM-DD")).toBe("2026-03-08");
  });

  test("remains valid even with weird input", () => {
    const { timestamp } = parseTaskTimestamp("!!!", "not-a-date");
    expect(timestamp.isValid()).toBe(true);
  });

  test("handles multi-line tasks starting with timestamp", () => {
    const multiLine = "16:37:23 Task\n    details\n    more details";
    const { displayName, timestamp } = parseTaskTimestamp(multiLine, fileBasename);
    expect(displayName).toBe("Task\n    details\n    more details");
    expect(timestamp.format("HH:mm:ss")).toBe("16:37:23");
  });
});
