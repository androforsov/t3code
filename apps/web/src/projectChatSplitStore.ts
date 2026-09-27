import type { ThreadId } from "@t3tools/contracts";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { resolveStorage } from "./lib/storage";

export type ChatPaneSide = "left" | "right";
export interface ProjectChatSplit {
  left: ThreadId;
  right: ThreadId;
  active: ChatPaneSide;
  ratio: number;
}

/** Sidebar navigation replaces the focused pane, while selecting its peer only changes focus. */
export function followThreadInSplit(split: ProjectChatSplit, threadId: ThreadId): ProjectChatSplit {
  const active =
    split.left === threadId ? "left" : split.right === threadId ? "right" : split.active;
  return split[active] === threadId && split.active === active
    ? split
    : { ...split, [active]: threadId, active };
}

export function clampChatSplitRatio(ratio: number): number {
  return Number.isFinite(ratio) ? Math.max(0.3, Math.min(0.7, ratio)) : 0.5;
}

interface ProjectChatSplitStore {
  byProject: Record<string, ProjectChatSplit>;
  open: (projectKey: string, left: ThreadId, right: ThreadId) => void;
  replace: (projectKey: string, side: ChatPaneSide, threadId: ThreadId) => void;
  follow: (projectKey: string, threadId: ThreadId) => void;
  focus: (projectKey: string, side: ChatPaneSide) => void;
  resize: (projectKey: string, ratio: number) => void;
  close: (projectKey: string) => void;
}

export const useProjectChatSplitStore = create<ProjectChatSplitStore>()(
  persist(
    (set) => ({
      byProject: {},
      open: (projectKey, left, right) => {
        if (left === right) return;
        set((state) => ({
          byProject: {
            ...state.byProject,
            [projectKey]: {
              left,
              right,
              active: "right",
              ratio: state.byProject[projectKey]?.ratio ?? 0.5,
            },
          },
        }));
      },
      replace: (projectKey, side, threadId) =>
        set((state) => {
          const split = state.byProject[projectKey];
          if (!split || split[side === "left" ? "right" : "left"] === threadId) return state;
          return {
            byProject: {
              ...state.byProject,
              [projectKey]: { ...split, [side]: threadId, active: side },
            },
          };
        }),
      follow: (projectKey, threadId) =>
        set((state) => {
          const split = state.byProject[projectKey];
          if (!split) return state;
          const next = followThreadInSplit(split, threadId);
          return next === split ? state : { byProject: { ...state.byProject, [projectKey]: next } };
        }),
      focus: (projectKey, active) =>
        set((state) => {
          const split = state.byProject[projectKey];
          return !split || split.active === active
            ? state
            : {
                byProject: { ...state.byProject, [projectKey]: { ...split, active } },
              };
        }),
      resize: (projectKey, ratio) =>
        set((state) => {
          const split = state.byProject[projectKey];
          return !split
            ? state
            : {
                byProject: {
                  ...state.byProject,
                  [projectKey]: { ...split, ratio: clampChatSplitRatio(ratio) },
                },
              };
        }),
      close: (projectKey) =>
        set((state) => {
          const byProject = { ...state.byProject };
          delete byProject[projectKey];
          return { byProject };
        }),
    }),
    {
      name: "t3code:project-chat-splits:v1",
      storage: createJSONStorage(() =>
        resolveStorage(typeof localStorage === "undefined" ? undefined : localStorage),
      ),
      partialize: (state) => ({ byProject: state.byProject }),
      // Treat persisted preferences as untrusted: malformed records must not break chat navigation.
      merge: (persisted, current) => {
        const byProject: Record<string, ProjectChatSplit> = {};
        if (persisted && typeof persisted === "object" && "byProject" in persisted) {
          const records = persisted.byProject;
          if (records && typeof records === "object") {
            for (const [key, value] of Object.entries(records)) {
              if (!value || typeof value !== "object") continue;
              const record = value as Partial<ProjectChatSplit>;
              if (
                typeof record.left !== "string" ||
                typeof record.right !== "string" ||
                record.left === record.right
              )
                continue;
              byProject[key] = {
                left: record.left,
                right: record.right,
                active: record.active === "left" ? "left" : "right",
                ratio: clampChatSplitRatio(record.ratio ?? 0.5),
              };
            }
          }
        }
        return { ...current, byProject };
      },
    },
  ),
);
