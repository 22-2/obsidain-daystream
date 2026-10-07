import { TFile } from "obsidian";
import { ObsidianAppShell } from "src/core/platform/obsidian-shell";
import { describe, expect, test, vi } from "vitest";

function createShell(initialContent: string) {
  let content = initialContent;
  const file = Object.assign(new TFile(), { path: "daily.md" });
  const write = vi.fn(async (_path: string, nextContent: string) => {
    content = nextContent;
  });
  const modify = vi.fn(async (_file: TFile, nextContent: string) => {
    content = nextContent;
  });

  const app = {
    vault: {
      getAbstractFileByPath: vi.fn((path: string) => (path === file.path ? file : null)),
      modify,
      adapter: {
        read: vi.fn(async () => content),
        write,
        append: vi.fn(),
      },
    },
  } as unknown as ConstructorParameters<typeof ObsidianAppShell>[0];

  return {
    helper: new ObsidianAppShell(app),
    file,
    getContent: () => content,
    write,
    modify,
  };
}

describe("ObsidianAppShell.insertTextAfter", () => {
  test("insertAfter marker直後でも投稿間に余計な空行を入れない", async () => {
    const { helper, file, getContent } = createShell("## Thino\n- 10:00:00 old\n");

    await helper.insertTextAfter(file, "\n- 11:00:00 new\n", "## Thino");

    expect(getContent()).toBe("## Thino\n- 11:00:00 new\n- 10:00:00 old\n");
  });

  test("marker の後ろに改行がない場合でも 1 つだけ補う", async () => {
    const { helper, file, getContent } = createShell("## Thino");

    await helper.insertTextAfter(file, "- 11:00:00 new\n", "## Thino");

    expect(getContent()).toBe("## Thino\n- 11:00:00 new\n");
  });

  test("末尾追記でも先頭改行を正規化して空行を増やさない", async () => {
    const { helper, file, getContent } = createShell("header");

    await helper.insertTextAfter(file, "\n## Thino", "");

    expect(getContent()).toBe("header\n## Thino");
  });
});

describe("ObsidianAppShell.writeFile", () => {
  test("既存ファイルは vault.modify を使って更新する", async () => {
    const { helper, file, write, modify, getContent } = createShell("before");

    await helper.writeFile(file.path, "after");

    expect(modify).toHaveBeenCalledTimes(1);
    expect(write).not.toHaveBeenCalled();
    expect(getContent()).toBe("after");
  });
});
