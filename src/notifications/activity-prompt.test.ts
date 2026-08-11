import {
  ACTIVITY_PROMPT_TEXT,
  createActivityPromptNotificationScheduler,
  resolveActivityPromptIntervalMs,
  type ActivityPromptNotification,
  type ActivityPromptNotificationConstructor,
  type ActivityPromptNotificationSchedulerOptions,
} from "src/notifications/activity-prompt";
import { describe, expect, it, vi } from "vitest";

describe("activity prompt notifications", () => {
  it("通知間隔をミリ秒へ変換し、0以下は無効にする", () => {
    expect(resolveActivityPromptIntervalMs(undefined)).toBe(60 * 60 * 1000);
    expect(resolveActivityPromptIntervalMs(15)).toBe(15 * 60 * 1000);
    expect(resolveActivityPromptIntervalMs(0)).toBeNull();
    expect(resolveActivityPromptIntervalMs(-1)).toBeNull();
    expect(resolveActivityPromptIntervalMs(Number.NaN)).toBeNull();
  });

  it("worker timer の周期実行で通知を作り、クリックをコールバックへ渡す", () => {
    let emit: (() => void) | undefined;
    const timerId = 42;
    const setInterval = vi.fn((callback: () => void) => {
      emit = callback;
      return timerId;
    }) as unknown as NonNullable<ActivityPromptNotificationSchedulerOptions["setInterval"]>;
    const clearInterval = vi.fn() as unknown as NonNullable<
      ActivityPromptNotificationSchedulerOptions["clearInterval"]
    >;
    const prompts: Array<ActivityPromptNotification & { close: ReturnType<typeof vi.fn> }> = [];
    const Notification = vi.fn(function () {
      const prompt = {
        onclick: null,
        onclose: null,
        close: vi.fn(),
      } satisfies ActivityPromptNotification;
      prompts.push(prompt);
      return prompt;
    }) as unknown as ActivityPromptNotificationConstructor;
    Notification.permission = "granted";
    const onClick = vi.fn();

    const scheduler = createActivityPromptNotificationScheduler({
      intervalMs: 1234,
      onClick,
      notification: Notification,
      setInterval,
      clearInterval,
    });

    scheduler.start();
    scheduler.start();
    expect(setInterval).toHaveBeenCalledTimes(1);
    expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 1234);

    emit?.();
    emit?.();
    expect(Notification).toHaveBeenCalledTimes(2);
    expect(Notification).toHaveBeenCalledWith(ACTIVITY_PROMPT_TEXT);

    prompts[0].onclick?.(new Event("click"));
    prompts[1].onclick?.(new Event("click"));
    expect(prompts[0].close).toHaveBeenCalledTimes(1);
    expect(prompts[1].close).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledTimes(2);

    emit?.();

    scheduler.stop();
    expect(clearInterval).toHaveBeenCalledWith(timerId);
    expect(prompts[2].close).toHaveBeenCalledTimes(1);
    emit?.();
    expect(Notification).toHaveBeenCalledTimes(3);
  });

  it("通知が拒否されている場合は作成しない", () => {
    let emit: (() => void) | undefined;
    const setInterval = vi.fn((callback: () => void) => {
      emit = callback;
      return 1;
    }) as unknown as NonNullable<ActivityPromptNotificationSchedulerOptions["setInterval"]>;
    const Notification = vi.fn(function () {
      return { onclick: null };
    }) as unknown as ActivityPromptNotificationConstructor;
    Notification.permission = "denied";

    const scheduler = createActivityPromptNotificationScheduler({
      intervalMs: 1000,
      onClick: vi.fn(),
      notification: Notification,
      setInterval,
      clearInterval: vi.fn() as unknown as NonNullable<
        ActivityPromptNotificationSchedulerOptions["clearInterval"]
      >,
    });

    scheduler.start();
    emit?.();
    expect(Notification).not.toHaveBeenCalled();
  });
});
