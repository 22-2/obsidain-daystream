import { createLocalStorageHost } from "src/__mocks__/local-storage-host";
import { DSTRStorage } from "src/core/storage";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("src/core/error-report", () => ({ reportError: vi.fn() }));

const APP_ID = "vault-1";
// 旧実装との互換キーを直接検証するため、Obsidian の vault 単位保存を経由しない素の localStorage を使う。
const rawStorage = window.localStorage;

function createStorage() {
  const host = createLocalStorageHost(APP_ID);
  const saveSpy = vi.spyOn(host, "saveLocalStorage");
  return { storage: new DSTRStorage(host), saveSpy };
}

describe("DSTRStorage", () => {
  beforeEach(() => {
    rawStorage.clear();
  });

  it("app.saveLocalStorage へ dstr- 付きのキーで保存し、読み戻せる", () => {
    const { storage, saveSpy } = createStorage();

    storage.set("drafts", [{ content: "a" }]);

    expect(saveSpy).toHaveBeenCalledWith("dstr-drafts", { value: [{ content: "a" }] });
    expect(rawStorage.getItem(`${APP_ID}-dstr-drafts`)).toBe('{"value":[{"content":"a"}]}');
    expect(storage.get("drafts", [])).toEqual([{ content: "a" }]);
  });

  it.each([false, "", 0])("falsy な値 %j も保存して読み戻せる", (value) => {
    const { storage } = createStorage();

    storage.set("state", value);

    expect(storage.get<unknown>("state", "default")).toBe(value);
  });

  it("未保存のキーは既定値を返す", () => {
    const { storage } = createStorage();

    expect(storage.get("missing", "fallback")).toBe("fallback");
  });

  it("null を保存するとキーが消え、既定値に戻る", () => {
    const { storage } = createStorage();
    storage.set("activeTag", "work");

    storage.set("activeTag", null);

    expect(rawStorage.getItem(`${APP_ID}-dstr-activeTag`)).toBeNull();
    expect(storage.get<string | null>("activeTag", null)).toBeNull();
  });

  it("remove でキーを消す", () => {
    const { storage } = createStorage();
    storage.set("asTask", true);

    storage.remove("asTask");

    expect(storage.get("asTask", false)).toBe(false);
  });

  it.each([
    ["dstr-<appId>-<key>", `dstr-${APP_ID}-granularity`],
    ["mfdi-<appId>-<key>", `mfdi-${APP_ID}-granularity`],
  ])("以前のキー %s の値を新しいキーへ移行する", (_label, previousKey) => {
    rawStorage.setItem(previousKey, '"week"');
    const { storage } = createStorage();

    expect(storage.get("granularity", "day")).toBe("week");
    expect(rawStorage.getItem(`${APP_ID}-dstr-granularity`)).toBe('{"value":"week"}');
    expect(rawStorage.getItem(previousKey)).toBeNull();
  });

  it("新しいキーの値を以前のキーより優先する", () => {
    rawStorage.setItem(`dstr-${APP_ID}-granularity`, '"week"');
    rawStorage.setItem(`${APP_ID}-dstr-granularity`, '{"value":"month"}');
    const { storage } = createStorage();

    expect(storage.get("granularity", "day")).toBe("month");
  });

  it("保存時に以前のキーを消し、古い値が後から復活しないようにする", () => {
    rawStorage.setItem(`dstr-${APP_ID}-granularity`, '"week"');
    rawStorage.setItem(`mfdi-${APP_ID}-granularity`, '"year"');
    const { storage } = createStorage();

    storage.set("granularity", "month");

    expect(rawStorage.getItem(`dstr-${APP_ID}-granularity`)).toBeNull();
    expect(rawStorage.getItem(`mfdi-${APP_ID}-granularity`)).toBeNull();
  });

  it("壊れた以前の値は捨てて既定値を返す", () => {
    rawStorage.setItem(`dstr-${APP_ID}-granularity`, "{broken");
    const { storage } = createStorage();

    expect(storage.get("granularity", "day")).toBe("day");
    expect(rawStorage.getItem(`dstr-${APP_ID}-granularity`)).toBeNull();
  });
});
