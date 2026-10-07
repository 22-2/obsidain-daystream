export const DB_UPDATE_CHANNEL_NAME = "mfdi-db-updates";
export const DB_UPDATED_MESSAGE_TYPE = "mfdi-db-updated";

export interface DBUpdatedMessage {
  type: typeof DB_UPDATED_MESSAGE_TYPE;
  detail?: { path?: string };
}

// 意図: 全viewで通知名と型判定を共有し、未知のBroadcastChannelメッセージを無視する。
export function subscribeToDBUpdates(callback: (message: DBUpdatedMessage) => void): () => void {
  if (typeof BroadcastChannel === "undefined") return () => {};

  const channel = new BroadcastChannel(DB_UPDATE_CHANNEL_NAME);
  channel.onmessage = (event: MessageEvent<unknown>) => {
    if (!event.data || typeof event.data !== "object") return;
    if (!("type" in event.data) || event.data.type !== DB_UPDATED_MESSAGE_TYPE) return;
    callback(event.data as DBUpdatedMessage);
  };

  return () => channel.close();
}
