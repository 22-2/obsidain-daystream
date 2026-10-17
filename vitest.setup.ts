import "fake-indexeddb/auto";
import { obsidianMoment } from "src/core/platform/obsidian-globals";
import { afterEach, beforeEach, vi } from "vitest";

// タイムゾーン（Asia/Tokyo）は vitest.config.ts で固定している。

Reflect.set(window, "moment", obsidianMoment);
Reflect.set(window, "activeDocument", document);

// Provide a minimal Worker stub for the test environment so imports
// that rely on `Worker` (e.g. Vite inline workers) don't throw in Node/JSDOM.
if (typeof window.Worker === "undefined") {
  class TestWorker {
    onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
    onerror: ((event: ErrorEvent) => void) | null = null;
    constructor(_script: string | Blob) {}
    postMessage(_msg: unknown) {}
    addEventListener(_type: string, _listener: EventListenerOrEventListenerObject) {}
    removeEventListener(_type: string, _listener: EventListenerOrEventListenerObject) {}
    terminate() {}
  }
  Object.defineProperty(window, "Worker", {
    configurable: true,
    value: TestWorker,
  });
}

// Default fake timers + deterministic system time for most tests.
// Individual tests may override this if they need a different time.
beforeEach(() => {
  vi.useFakeTimers();
  // Default 'now' matching existing test expectations
  vi.setSystemTime(new Date("2026-03-02T16:00:00.000+09:00"));
});

afterEach(() => {
  vi.useRealTimers();
});
