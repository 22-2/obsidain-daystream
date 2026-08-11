export function forceLowerCaseKeys<T>(obj: { [key: string]: T }): {
  [key: string]: T;
} {
  return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key.toLowerCase(), value]));
}
