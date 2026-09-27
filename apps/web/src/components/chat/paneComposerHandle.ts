import type { ComposerHandleRef } from "../../composerHandleContext";
import type { ChatComposerHandle } from "./ChatComposer";

/** Each pane owns its send context; only the focused pane lends its handle to the command palette. */
export function createPaneComposerHandle(
  parent: ComposerHandleRef | null,
  isActive: () => boolean,
) {
  let handle: ChatComposerHandle | null = null;
  const ref: ComposerHandleRef = {
    get current() {
      return handle;
    },
    set current(next) {
      const previous = handle;
      handle = next;
      if (parent && (isActive() || (previous !== null && parent.current === previous))) {
        parent.current = next;
      }
    },
  };
  return {
    ref,
    activate: () => {
      if (parent) parent.current = handle;
    },
  };
}
