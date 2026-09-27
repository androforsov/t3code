import { describe, expect, it } from "vite-plus/test";
import type { ChatComposerHandle } from "./ChatComposer";
import type { ComposerHandleRef } from "../../composerHandleContext";
import { createPaneComposerHandle } from "./paneComposerHandle";

function composer(provider: string) {
  return {
    getSendContext: () => ({ selectedProvider: provider }),
  } as unknown as ChatComposerHandle;
}

describe("paired composer handles", () => {
  it("keeps provider send contexts separate while the palette follows focus", () => {
    const parent: ComposerHandleRef = { current: null };
    let active = "left";
    const left = createPaneComposerHandle(parent, () => active === "left");
    const right = createPaneComposerHandle(parent, () => active === "right");
    left.ref.current = composer("claudeAgent");
    right.ref.current = composer("codex");
    expect(left.ref.current.getSendContext().selectedProvider).toBe("claudeAgent");
    expect(right.ref.current.getSendContext().selectedProvider).toBe("codex");
    expect(parent.current?.getSendContext().selectedProvider).toBe("claudeAgent");
    active = "right";
    right.activate();
    expect(parent.current?.getSendContext().selectedProvider).toBe("codex");
    left.ref.current = composer("claudeAgent");
    expect(parent.current).toBe(right.ref.current);
    const updated = composer("codex");
    right.ref.current = updated;
    expect(parent.current).toBe(updated);
    left.ref.current = null;
    expect(parent.current).toBe(updated);
    right.ref.current = null;
    expect(parent.current).toBeNull();
  });
});
