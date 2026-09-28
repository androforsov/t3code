import { beforeEach, describe, expect, it } from "vite-plus/test";
import { ThreadId } from "@t3tools/contracts";
import {
  clampChatSplitRatio,
  followThreadInSplit,
  placeThreadInSplit,
  useProjectChatSplitStore,
} from "./projectChatSplitStore";

const a = ThreadId.make("thread-a");
const b = ThreadId.make("thread-b");
const c = ThreadId.make("thread-c");

describe("paired project conversations", () => {
  beforeEach(() => useProjectChatSplitStore.setState({ byProject: {} }));

  it("opens unrelated sidebar chats alone without changing the linked pair", () => {
    const split = { left: a, right: b, active: "right" as const, ratio: 0.4 };
    expect(followThreadInSplit(split, c)).toBeNull();
    const store = useProjectChatSplitStore.getState();
    store.open("host:project", a, b);
    store.resize("host:project", 0.4);
    store.follow("host:project", c);
    expect(useProjectChatSplitStore.getState().byProject["host:project"]).toEqual(split);
    store.follow("host:project", a);
    expect(useProjectChatSplitStore.getState().byProject["host:project"]).toEqual({
      ...split,
      active: "left",
    });
  });

  it("focuses an already visible conversation without duplicating it or swapping panes", () => {
    const split = { left: a, right: b, active: "right" as const, ratio: 0.5 };
    expect(followThreadInSplit(split, a)).toEqual({ ...split, active: "left" });
    expect(followThreadInSplit(split, b)).toBe(split);
  });

  it("remembers separate pairs and divider positions per project and host", () => {
    const store = useProjectChatSplitStore.getState();
    store.open("host-1:project", a, b);
    store.resize("host-1:project", 0.6);
    store.open("host-2:project", b, c);
    store.focus("host-1:project", "left");
    store.follow("host-1:project", c);
    expect(useProjectChatSplitStore.getState().byProject).toEqual({
      "host-1:project": { left: a, right: b, active: "left", ratio: 0.6 },
      "host-2:project": { left: b, right: c, active: "right", ratio: 0.5 },
    });
    store.close("host-1:project");
    expect(useProjectChatSplitStore.getState().byProject["host-2:project"]).toBeDefined();
    expect(useProjectChatSplitStore.getState().byProject["host-1:project"]).toBeUndefined();
  });

  it("replaces either pane explicitly and refuses to duplicate its peer", () => {
    const store = useProjectChatSplitStore.getState();
    store.open("host:project", a, b);
    store.replace("host:project", "left", c);
    expect(useProjectChatSplitStore.getState().byProject["host:project"]).toMatchObject({
      left: c,
      right: b,
      active: "left",
    });
    store.replace("host:project", "right", c);
    expect(useProjectChatSplitStore.getState().byProject["host:project"]?.right).toBe(b);
  });

  it("swaps positions while focus and width follow the conversation, and can swap back", () => {
    const store = useProjectChatSplitStore.getState();
    store.open("host:project", a, b);
    store.focus("host:project", "left");
    store.resize("host:project", 0.4);
    store.swap("host:project");
    const swapped = useProjectChatSplitStore.getState().byProject["host:project"]!;
    expect(swapped).toEqual({ left: b, right: a, active: "right", ratio: 0.6 });
    expect(followThreadInSplit(swapped, a)).toBe(swapped);
    store.swap("host:project");
    expect(useProjectChatSplitStore.getState().byProject["host:project"]).toEqual({
      left: a,
      right: b,
      active: "left",
      ratio: 0.4,
    });
  });

  it("a deliberate drop in a standalone chat pairs with that chat, not a hidden linked member", () => {
    const store = useProjectChatSplitStore.getState();
    store.open("host:project", a, b);
    store.place("host:project", c, a, "left");
    expect(useProjectChatSplitStore.getState().byProject["host:project"]).toEqual({
      left: a,
      right: c,
      active: "left",
      ratio: 0.5,
    });
  });

  it("refuses to mount two editors for the same thread", () => {
    useProjectChatSplitStore.getState().open("host:project", a, a);
    expect(useProjectChatSplitStore.getState().byProject).toEqual({});
  });

  it("keeps either pane usable at extreme or invalid divider positions", () => {
    expect(clampChatSplitRatio(-5)).toBe(0.15);
    expect(clampChatSplitRatio(5)).toBe(0.85);
    expect(clampChatSplitRatio(Number.NaN)).toBe(0.5);
  });
});

describe("placing a dragged conversation", () => {
  it("opens either side of a single conversation", () => {
    expect(placeThreadInSplit(null, a, b, "left")).toEqual({
      left: b,
      right: a,
      active: "left",
      ratio: 0.5,
    });
    expect(placeThreadInSplit(null, a, b, "right")).toEqual({
      left: a,
      right: b,
      active: "right",
      ratio: 0.5,
    });
    expect(placeThreadInSplit(null, a, a, "right")).toBeNull();
  });
  it("replaces only the target and preserves the divider", () => {
    const split = { left: a, right: b, active: "right" as const, ratio: 0.65 };
    expect(placeThreadInSplit(split, b, c, "left")).toEqual({ ...split, left: c, active: "left" });
  });
  it("moves the visible peer instead of duplicating it", () => {
    const split = { left: a, right: b, active: "left" as const, ratio: 0.65 };
    expect(placeThreadInSplit(split, a, b, "left")).toEqual({
      left: b,
      right: a,
      active: "left",
      ratio: 0.35,
    });
    expect(placeThreadInSplit(split, a, a, "left")).toEqual(split);
  });
});
