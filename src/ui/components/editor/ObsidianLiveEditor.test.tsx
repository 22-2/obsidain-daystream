import { render } from "@testing-library/react";
import React from "react";
import {
  ObsidianLiveEditor,
  type ObsidianLiveEditorRef,
} from "src/ui/components/editor/ObsidianLiveEditor";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type MockEditorApi = {
  focus: ReturnType<typeof vi.fn>;
  getContent: ReturnType<typeof vi.fn>;
  getContentSnapshot: ReturnType<typeof vi.fn>;
  subscribeContent: ReturnType<typeof vi.fn>;
  setContent: ReturnType<typeof vi.fn>;
  setReadOnly: ReturnType<typeof vi.fn>;
  setPlaceholder: ReturnType<typeof vi.fn>;
};

const editorState = vi.hoisted(() => ({
  api: null as MockEditorApi | null,
  onChange: null as ((text: string) => void) | null,
}));

vi.mock("@22-2/obsidian-magical-editor", () => ({}));

vi.mock("src/ui/components/editor/useFakeEditor", () => ({
  useFakeEditor: vi.fn((_containerRef: unknown, options: { onChange: (text: string) => void }) => {
    editorState.onChange = options.onChange;
    return {
      editorRef: { current: editorState.api },
      isSyncingRef: { current: false },
    };
  }),
}));

function createMockEditor(snapshot = ""): MockEditorApi {
  let currentSnapshot = snapshot;

  return {
    focus: vi.fn(),
    getContent: vi.fn(() => currentSnapshot),
    getContentSnapshot: vi.fn(() => currentSnapshot),
    subscribeContent: vi.fn(() => () => {}),
    setContent: vi.fn((text: string) => {
      currentSnapshot = text;
    }),
    setReadOnly: vi.fn(),
    setPlaceholder: vi.fn(),
  };
}

describe("ObsidianLiveEditor", () => {
  beforeEach(() => {
    editorState.api = createMockEditor("");
    editorState.onChange = null;
  });

  afterEach(() => {
    editorState.api = null;
    editorState.onChange = null;
  });

  it("exposes imperative API via ref", () => {
    const ref = React.createRef<ObsidianLiveEditorRef>();

    render(
      <ObsidianLiveEditor
        ref={ref}
        leaf={{} as never}
        app={{} as never}
        initialValue=""
        onChange={vi.fn()}
      />,
    );

    expect(ref.current).toBeDefined();

    // Testing focus
    ref.current?.focus();
    expect(editorState.api?.focus).toHaveBeenCalled();

    // Testing setContent
    ref.current?.setContent("new content");
    expect(editorState.api?.setContent).toHaveBeenCalledWith("new content");

    // Testing getValue
    expect(ref.current?.getValue()).toBe("new content");
  });

  it("passes onChange properly", () => {
    const onChangeMock = vi.fn();
    render(
      <ObsidianLiveEditor
        ref={null}
        leaf={{} as never}
        app={{} as never}
        initialValue=""
        onChange={onChangeMock}
      />,
    );

    editorState.onChange?.("typed by user");
    expect(onChangeMock).toHaveBeenCalledWith("typed by user");
  });
});
