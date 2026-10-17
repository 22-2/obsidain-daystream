import {
  type ElectronPowerMonitorLike,
  watchElectronPowerState,
} from "src/core/platform/electron-power";
import { describe, expect, it, vi } from "vitest";

type PowerStateEvent = Parameters<ElectronPowerMonitorLike["on"]>[0];

describe("electron power state watcher", () => {
  it("registers inactive and active power events", () => {
    const listeners = new Map<PowerStateEvent, () => void>();
    const powerMonitor: ElectronPowerMonitorLike = {
      on: vi.fn((event: PowerStateEvent, listener: () => void) => {
        listeners.set(event, listener);
      }),
      removeListener: vi.fn(),
    };
    const onInactive = vi.fn();
    const onActive = vi.fn();

    const stopWatching = watchElectronPowerState({
      powerMonitor,
      onInactive,
      onActive,
    });

    listeners.get("lock-screen")?.();
    listeners.get("suspend")?.();
    listeners.get("user-did-resign-active")?.();
    listeners.get("unlock-screen")?.();
    listeners.get("resume")?.();
    listeners.get("user-did-become-active")?.();

    expect(onInactive).toHaveBeenCalledTimes(3);
    expect(onActive).toHaveBeenCalledTimes(3);
    expect(powerMonitor.on).toHaveBeenCalledTimes(6);

    stopWatching();
    expect(powerMonitor.removeListener).toHaveBeenCalledTimes(6);
  });

  it("does nothing when Electron powerMonitor is unavailable", () => {
    const onInactive = vi.fn();
    const onActive = vi.fn();

    const stopWatching = watchElectronPowerState({
      onInactive,
      onActive,
    });

    expect(() => stopWatching()).not.toThrow();
    expect(onInactive).not.toHaveBeenCalled();
    expect(onActive).not.toHaveBeenCalled();
  });
});
