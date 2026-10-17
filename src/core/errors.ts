// 意図: Promise の reject には Error を渡し、スタックと原因の文面を失わないようにする。
export function toError(value: unknown, fallbackMessage = "Unknown error"): Error {
  if (value instanceof Error) return value;
  return new Error(typeof value === "string" ? value : fallbackMessage);
}
