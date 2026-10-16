import { afterEach, describe, expect, it, vi } from "vitest";
import { subscribeToDBUpdates } from "src/core/db/updates";

describe("subscribeToDBUpdates", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("forwards database update messages and closes its channel on cleanup", () => {
    const close = vi.fn();
    class FakeBroadcastChannel {
      onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
      close = close;

      constructor(readonly name: string) {}
    }
    let channel: FakeBroadcastChannel | undefined;
    const OriginalBroadcastChannel = FakeBroadcastChannel;
    class TrackingBroadcastChannel extends OriginalBroadcastChannel {
      constructor(name: string) {
        super(name);
        channel = this;
      }
    }
    vi.stubGlobal("BroadcastChannel", TrackingBroadcastChannel);

    const onUpdate = vi.fn();
    const cleanup = subscribeToDBUpdates(onUpdate);

    expect(channel?.name).toBe("dstr-db-updates");
    channel?.onmessage?.({ data: { type: "unrelated" } } as MessageEvent<unknown>);
    expect(onUpdate).not.toHaveBeenCalled();

    channel?.onmessage?.({
      data: { type: "dstr-db-updated", detail: { path: "daily/2026-10-07.md" } },
    } as MessageEvent<unknown>);
    expect(onUpdate).toHaveBeenCalledWith({
      type: "dstr-db-updated",
      detail: { path: "daily/2026-10-07.md" },
    });

    cleanup();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("returns a no-op cleanup when BroadcastChannel is unavailable", () => {
    vi.stubGlobal("BroadcastChannel", undefined);

    expect(() => subscribeToDBUpdates(vi.fn())()).not.toThrow();
  });
});
