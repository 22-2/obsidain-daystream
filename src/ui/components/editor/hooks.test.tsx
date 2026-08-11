import { act, cleanup, render } from "@testing-library/react";
import { useRef } from "react";
import { useFakeEditor } from "src/ui/components/editor/useFakeEditor";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type MockFakeEditorOptions = {
  onChange: (text: string) => void;
  onEnter: (_editor: unknown, mod: boolean, shift: boolean) => boolean;
  parentScope: object;
  initialContent: string;
  placeholder?: string;
  isReadOnly?: boolean;
  readonlyPlaceholder?: string;
};

type Deferred = {
  promise: Promise<void>;
  resolve: () => void;
};

type MockFakeEditorInstance = {
  options: MockFakeEditorOptions;
  ready: Promise<void>;
  view: { containerEl: HTMLDivElement } | null;
  content: string;
  setContentCalls: string[];
  destroyed: boolean;
  loadToDom: (parent: HTMLElement) => void;
  focus: () => void;
  getContent: () => string;
  getContentSnapshot: () => string;
  subscribeContent: (_listener: (text: string) => void) => () => void;
  setContent: (text: string) => void;
  setReadOnly: (_isReadOnly: boolean) => void;
  setPlaceholder: (_placeholder: string, _readonlyPlaceholder?: string) => void;
  destroy: () => void;
};

function createDeferred(): Deferred {
  let resolve!: () => void;
  const promise = new Promise<void>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
}

const fakeEditorState = vi.hoisted(() => ({
  instances: [] as MockFakeEditorInstance[],
  deferred: null as Deferred | null,
  triggerOnLoad: null as string | null,
}));

if (!("empty" in HTMLElement.prototype)) {
  Object.defineProperty(HTMLElement.prototype, "empty", {
    value(this: HTMLElement) {
      this.replaceChildren();
    },
    configurable: true,
    writable: true,
  });
}

vi.mock("@22-2/obsidian-magical-editor", () => {
  class FakeEditorMock implements MockFakeEditorInstance {
    options: MockFakeEditorOptions;
    ready: Promise<void>;
    view: { containerEl: HTMLDivElement } | null;
    content: string;
    setContentCalls: string[];
    destroyed: boolean;

    constructor(_app: unknown, options: MockFakeEditorOptions) {
      this.options = options;
      this.content = options.initialContent;
      this.view = { containerEl: document.createElement("div") };
      this.setContentCalls = [];
      this.destroyed = false;

      const deferred = createDeferred();
      this.ready = deferred.promise;
      fakeEditorState.deferred = deferred;
      fakeEditorState.instances.push(this);
    }

    loadToDom(parent: HTMLElement) {
      this.view?.containerEl.classList.add("mock-editor");
      this.view?.containerEl.remove();
      parent.appendChild(this.view!.containerEl);

      if (fakeEditorState.triggerOnLoad !== null) {
        this.options.onChange(fakeEditorState.triggerOnLoad);
      }
    }

    focus() {}

    getContent() {
      return this.content;
    }

    getContentSnapshot() {
      return this.content;
    }

    subscribeContent(_listener: (text: string) => void) {
      return () => {};
    }

    setContent(text: string) {
      this.setContentCalls.push(text);
      this.content = text;
    }

    setReadOnly(_isReadOnly: boolean) {}

    setPlaceholder(_placeholder: string, _readonlyPlaceholder?: string) {}

    destroy() {
      this.destroyed = true;
    }
  }

  return { FakeEditor: FakeEditorMock };
});

type HookHarnessProps = {
  initialValue: string;
  onChange: (text: string) => void;
};

function HookHarness({ initialValue, onChange }: HookHarnessProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useFakeEditor(containerRef, {
    app: {} as never,
    leaf: { view: { scope: {} } } as never,
    initialValue,
    onChange,
    placeholder: "placeholder",
    readonlyPlaceholder: "readonly",
  });

  return <div ref={containerRef} />;
}

describe("useFakeEditor", () => {
  beforeEach(() => {
    fakeEditorState.instances.length = 0;
    fakeEditorState.deferred = null;
    fakeEditorState.triggerOnLoad = null;
  });

  afterEach(() => {
    cleanup();
  });

  it("ready 前の空 onChange では store 同期を発火しない", async () => {
    fakeEditorState.triggerOnLoad = "";
    const onChange = vi.fn();

    render(<HookHarness initialValue="persisted draft" onChange={onChange} />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(onChange).not.toHaveBeenCalled();

    await act(async () => {
      fakeEditorState.deferred?.resolve();
      await Promise.resolve();
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("初期化待ちの間に更新された initialValue でも wrapper 側で ready 後 setContent しない", async () => {
    const onChange = vi.fn();
    const view = render(<HookHarness initialValue="" onChange={onChange} />);

    await act(async () => {
      await Promise.resolve();
    });

    const [instance] = fakeEditorState.instances;
    expect(instance).toBeDefined();
    expect(instance.setContentCalls).toEqual([]);

    view.rerender(<HookHarness initialValue="restored draft" onChange={onChange} />);

    await act(async () => {
      fakeEditorState.deferred?.resolve();
      await Promise.resolve();
    });

    expect(instance.setContentCalls).toEqual([]);
  });

  it("snapshot が一致している場合も wrapper 側で ready 後 setContent を重ねない", async () => {
    const onChange = vi.fn();

    render(<HookHarness initialValue="already-restored" onChange={onChange} />);

    await act(async () => {
      await Promise.resolve();
    });

    const [instance] = fakeEditorState.instances;
    expect(instance).toBeDefined();
    expect(instance.getContentSnapshot()).toBe("already-restored");

    await act(async () => {
      fakeEditorState.deferred?.resolve();
      await Promise.resolve();
    });

    expect(instance.setContentCalls).toEqual([]);
  });
});
