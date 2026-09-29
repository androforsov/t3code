// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import { ThreadId } from "@t3tools/contracts";
import { useProjectChatSplitStore } from "../projectChatSplitStore";
import { LinkedThreadBrackets } from "./LinkedThreadBrackets";
import { TooltipProvider } from "./ui/tooltip";
vi.mock("../state/entities", () => ({ useThreadShells: () => rows }));
const rows = [
  { environmentId: "host", id: "a", title: "Stage 1 Codex" },
  { environmentId: "host", id: "b", title: "Stage 1 Claude" },
];
let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
    this: HTMLElement,
  ) {
    const top =
      this.dataset.linkedThreadKey === "host:a"
        ? 10
        : this.dataset.linkedThreadKey === "host:b"
          ? 46
          : 0;
    return {
      x: 0,
      y: top,
      top,
      left: 0,
      right: 240,
      bottom: top + 32,
      width: 240,
      height: 32,
      toJSON: () => ({}),
    } as DOMRect;
  });
  useProjectChatSplitStore.setState({ byProject: {} });
  useProjectChatSplitStore.getState().open("host:project", ThreadId.make("a"), ThreadId.make("b"));
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
async function render(keys: string[]) {
  await act(async () =>
    root.render(
      <TooltipProvider>
        <LinkedThreadBrackets>
          {keys.map((key) => (
            <div key={key} data-linked-thread-key={key}>
              {key}
            </div>
          ))}
        </LinkedThreadBrackets>
      </TooltipProvider>,
    ),
  );
}
it("connects both linked rows to one control and unlinks without removing conversations", async () => {
  await render(["host:a", "host:b"]);
  expect(container.querySelectorAll("button")).toHaveLength(1);
  expect(container.querySelector("button")?.getAttribute("aria-label")).toBe(
    "Unlink Stage 1 Codex and Stage 1 Claude",
  );
  expect(
    (container.querySelector("[data-linked-thread-connector]") as HTMLElement).style.height,
  ).toBe("36px");
  await act(async () => container.querySelector("button")!.click());
  expect(useProjectChatSplitStore.getState().byProject).toEqual({});
  expect(container.querySelectorAll("[data-linked-thread-key]")).toHaveLength(2);
  expect(container.querySelector("button")).toBeNull();
});
it("keeps an unlink control available when the other linked row is collapsed", async () => {
  await render(["host:a"]);
  expect(container.querySelector("button")).not.toBeNull();
  await act(async () => container.querySelector("button")!.click());
  expect(useProjectChatSplitStore.getState().byProject).toEqual({});
});
it("does not draw connectors on another environment's rows", async () => {
  await render(["other:a", "other:b"]);
  expect(container.querySelector("button")).toBeNull();
});
