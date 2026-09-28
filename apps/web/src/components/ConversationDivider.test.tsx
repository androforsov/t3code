// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import { ConversationDivider } from "./ConversationDivider";
let root: Root;
let container: HTMLDivElement;
const resize = vi.fn();
const swap = vi.fn();
beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  resize.mockClear();
  swap.mockClear();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root.render(
      <ConversationDivider ratio={0.5} width={() => 1000} onResize={resize} onSwap={swap} />,
    ),
  );
  for (const node of container.querySelectorAll<HTMLElement>("button, [role=separator]")) {
    node.setPointerCapture = vi.fn();
    node.hasPointerCapture = () => true;
    node.releasePointerCapture = vi.fn();
  }
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
const button = () => container.querySelector("button")!;
async function event(node: Element, type: string, x = 0, detail = 1) {
  await act(async () =>
    node.dispatchEvent(
      new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        button: 0,
        clientX: x,
        clientY: 100,
        detail,
      }),
    ),
  );
}
it("clicking the arrows swaps, including small pointer jitter", async () => {
  await event(button(), "pointerdown", 400);
  await event(button(), "pointermove", 402);
  await event(button(), "pointerup", 402);
  await event(button(), "click", 402);
  expect(swap).toHaveBeenCalledOnce();
  expect(resize).not.toHaveBeenCalled();
});
it("dragging from the arrows resizes from the starting width and never swaps on release", async () => {
  await event(button(), "pointerdown", 400);
  await event(button(), "pointermove", 500);
  await event(button(), "pointerup", 500);
  await event(button(), "click", 500);
  expect(resize).toHaveBeenLastCalledWith(0.6);
  expect(swap).not.toHaveBeenCalled();
  await event(button(), "click", 0, 0); // Keyboard activation remains usable after a drag.
  expect(swap).toHaveBeenCalledOnce();
});
it("cancelling a drag does not swap and a later ordinary click works", async () => {
  await event(button(), "pointerdown", 400);
  await event(button(), "pointermove", 300);
  await event(button(), "pointercancel", 300);
  await event(button(), "click", 300);
  expect(swap).not.toHaveBeenCalled();
  await event(button(), "pointerdown", 400);
  await event(button(), "pointerup", 400);
  await event(button(), "click", 400);
  expect(swap).toHaveBeenCalledOnce();
});
it("the divider line supports the same drag gesture", async () => {
  const line = container.querySelector("[role=separator]")!;
  await event(line, "pointerdown", 500);
  await event(line, "pointermove", 300);
  await event(line, "pointerup", 300);
  expect(resize).toHaveBeenLastCalledWith(0.3);
  expect(swap).not.toHaveBeenCalled();
});
