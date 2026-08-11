import {
  clearInterval as clearWorkerInterval,
  setInterval as setWorkerInterval,
} from "worker-timers";

export const ACTIVITY_PROMPT_TEXT = "今なにやってる？";
export const DEFAULT_ACTIVITY_PROMPT_INTERVAL_MINUTES = 60;

type NotificationPermissionState = "default" | "denied" | "granted";

export interface ActivityPromptNotification {
  onclick: ((event: Event) => void) | null;
  onclose?: ((event: Event) => void) | null;
  close?: () => void;
}

export interface ActivityPromptNotificationConstructor {
  new (
    title: string,
    options?: NotificationOptions,
  ): ActivityPromptNotification;
  permission?: NotificationPermissionState;
  requestPermission?: () => Promise<NotificationPermissionState>;
}

type ActivityPromptTimerId = ReturnType<typeof setWorkerInterval>;
type SetActivityPromptInterval = (
  callback: () => void,
  intervalMs: number,
) => ActivityPromptTimerId;
type ClearActivityPromptInterval = (id: ActivityPromptTimerId) => void;

export interface ActivityPromptNotificationSchedulerOptions {
  onClick: () => void;
  intervalMs: number;
  notification?: ActivityPromptNotificationConstructor;
  setInterval?: SetActivityPromptInterval;
  clearInterval?: ClearActivityPromptInterval;
}

export interface ActivityPromptNotificationScheduler {
  start: () => void;
  stop: () => void;
}

function getGlobalNotification():
  ActivityPromptNotificationConstructor | undefined {
  return (
    globalThis as typeof globalThis & {
      Notification?: ActivityPromptNotificationConstructor;
    }
  ).Notification;
}

export function resolveActivityPromptIntervalMs(
  intervalMinutes: number | undefined,
): number | null {
  const minutes = intervalMinutes ?? DEFAULT_ACTIVITY_PROMPT_INTERVAL_MINUTES;
  if (!Number.isFinite(minutes) || minutes <= 0) return null;

  return minutes * 60 * 1000;
}

export function createActivityPromptNotificationScheduler(
  options: ActivityPromptNotificationSchedulerOptions,
): ActivityPromptNotificationScheduler {
  const {
    onClick,
    intervalMs,
    notification = getGlobalNotification(),
    setInterval = setWorkerInterval,
    clearInterval = clearWorkerInterval,
  } = options;

  let timerId: ActivityPromptTimerId | null = null;
  let isRunning = false;
  let permissionRequest: Promise<NotificationPermissionState> | null = null;
  const activeNotifications = new Set<ActivityPromptNotification>();

  const showNotification = () => {
    if (!isRunning || !notification) return;

    let prompt: ActivityPromptNotification;
    try {
      prompt = new notification(ACTIVITY_PROMPT_TEXT);
    } catch {
      // Notification が許可されていない環境では、タイマー自体は維持して
      // 許可状態が変わった次回以降の実行に再試行させる。
      return;
    }

    activeNotifications.add(prompt);
    const releasePrompt = () => activeNotifications.delete(prompt);
    prompt.onclick = () => {
      releasePrompt();
      prompt.close?.();
      onClick();
    };
    prompt.onclose = releasePrompt;
  };

  const emitNotification = () => {
    if (!isRunning || !notification) return;
    if (notification.permission === "denied") return;

    if (
      notification.permission === "default" &&
      notification.requestPermission
    ) {
      if (permissionRequest) return;

      permissionRequest = Promise.resolve(notification.requestPermission())
        .then((permission) => {
          if (isRunning && permission === "granted") {
            showNotification();
          }
          return permission;
        })
        .catch(() => "denied" as const)
        .finally(() => {
          permissionRequest = null;
        });
      return;
    }

    showNotification();
  };

  return {
    start: () => {
      if (isRunning || !notification || intervalMs <= 0) return;

      isRunning = true;
      timerId = setInterval(emitNotification, intervalMs);
    },
    stop: () => {
      isRunning = false;
      permissionRequest = null;
      if (timerId === null) return;

      clearInterval(timerId);
      timerId = null;
      activeNotifications.forEach((prompt) => prompt.close?.());
      activeNotifications.clear();
    },
  };
}
