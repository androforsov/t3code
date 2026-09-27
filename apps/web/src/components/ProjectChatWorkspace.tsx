import { ComposerHandleContext, useComposerHandleContext } from "../composerHandleContext";
import { createPaneComposerHandle } from "./chat/paneComposerHandle";
import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import type { EnvironmentId, ThreadId } from "@t3tools/contracts";
import { useNavigate } from "@tanstack/react-router";
import { Columns2Icon, XIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { useThreadShell, useThreadShells } from "../state/entities";
import { buildThreadRouteParams, type ThreadRouteTarget } from "../threadRoutes";
import {
  clampChatSplitRatio,
  followThreadInSplit,
  useProjectChatSplitStore,
  type ChatPaneSide,
} from "../projectChatSplitStore";
import { ThreadRouteView } from "./ThreadRouteView";
import { ChatPaneContext } from "./chat/ChatPaneContext";
import { Button } from "./ui/button";
import { Select, SelectTrigger, SelectValue, SelectPopup, SelectItem } from "./ui/select";
import { SidebarInset } from "./ui/sidebar";

function ChatPane({
  projectKey,
  side,
  environmentId,
  threadId,
  active,
  onActivate,
}: {
  projectKey: string;
  side: ChatPaneSide;
  environmentId: EnvironmentId;
  threadId: ThreadId;
  active: boolean;
  onActivate: () => void;
}) {
  const isActive = useCallback(
    () => useProjectChatSplitStore.getState().byProject[projectKey]?.active === side,
    [projectKey, side],
  );
  const parentComposer = useComposerHandleContext();
  const composer = useMemo(
    () => createPaneComposerHandle(parentComposer, isActive),
    [parentComposer, isActive],
  );
  const activate = () => {
    onActivate();
    composer.activate();
  };
  return (
    <section
      aria-label={`${side === "left" ? "Left" : "Right"} conversation`}
      data-chat-pane={side}
      data-active={active}
      onPointerDownCapture={activate}
      onFocusCapture={activate}
      className={`h-full min-h-0 min-w-0 flex-col overflow-hidden border-t-2 ${active ? "flex border-ring" : "hidden border-transparent lg:flex"}`}
    >
      <ChatPaneContext value={isActive}>
        <ComposerHandleContext value={composer.ref}>
          <ThreadRouteView
            embedded
            target={{ kind: "server", threadRef: scopeThreadRef(environmentId, threadId) }}
          />
        </ComposerHandleContext>
      </ChatPaneContext>
    </section>
  );
}

/** Two existing threads in one project; execution and mobile contracts remain unchanged. */
export function ProjectChatWorkspace({ target }: { target: ThreadRouteTarget }) {
  const navigate = useNavigate();
  const ref = target.kind === "server" ? target.threadRef : null;
  const current = useThreadShell(ref);
  const threads = useThreadShells();
  const projectKey = current ? `${current.environmentId}:${current.projectId}` : null;
  const stored = useProjectChatSplitStore((state) =>
    projectKey ? state.byProject[projectKey] : undefined,
  );
  const split = stored && current ? followThreadInSplit(stored, current.id) : null;
  const projectThreads = current
    ? threads.filter(
        (thread) =>
          thread.environmentId === current.environmentId &&
          thread.projectId === current.projectId &&
          thread.archivedAt === null,
      )
    : [];
  const available = new Set(projectThreads.map((thread) => thread.id));
  const paired = split && available.has(split.left) && available.has(split.right) ? split : null;
  const container = useRef<HTMLDivElement>(null);

  const currentThreadId = current?.id;
  useEffect(() => {
    if (projectKey && currentThreadId)
      useProjectChatSplitStore.getState().follow(projectKey, currentThreadId);
  }, [projectKey, currentThreadId]);

  const activate = (side: ChatPaneSide) => {
    if (!projectKey || !paired || !ref) return;
    useProjectChatSplitStore.getState().focus(projectKey, side);
    if (paired[side] !== ref.threadId) {
      void navigate({
        to: "/$environmentId/$threadId",
        params: buildThreadRouteParams(scopeThreadRef(ref.environmentId, paired[side])),
        replace: true,
      });
    }
  };
  const openBeside = (threadId: ThreadId) => {
    if (!projectKey || !current || !available.has(threadId) || threadId === current.id) return;
    useProjectChatSplitStore.getState().open(projectKey, current.id, threadId);
    void navigate({
      to: "/$environmentId/$threadId",
      params: buildThreadRouteParams(scopeThreadRef(current.environmentId, threadId)),
    });
  };
  const close = () => {
    if (projectKey) useProjectChatSplitStore.getState().close(projectKey);
  };

  return (
    <SidebarInset className="h-svh min-h-0 overflow-hidden overscroll-y-none md:h-dvh">
      {current ? (
        <div className="flex shrink-0 items-center gap-2 border-b border-border bg-background px-3 py-2 [-webkit-app-region:no-drag]">
          <Columns2Icon className="size-4 text-muted-foreground" aria-hidden />
          <label htmlFor="open-thread-beside" className="text-sm text-muted-foreground">
            Open beside
          </label>
          <div className="min-w-0 flex-1">
            <Select
              value={null}
              disabled={projectThreads.length < 2}
              onValueChange={(value) => {
                if (value) openBeside(value as ThreadId);
              }}
            >
              <SelectTrigger
                id="open-thread-beside"
                aria-label="Open another conversation beside this one"
                size="sm"
              >
                <SelectValue
                  placeholder={
                    projectThreads.length < 2
                      ? "Create another thread in this project first"
                      : "Choose a thread in this project…"
                  }
                />
              </SelectTrigger>
              <SelectPopup>
                {projectThreads
                  .filter((thread) => thread.id !== current.id)
                  .map((thread) => (
                    <SelectItem key={thread.id} value={thread.id}>
                      {thread.title}
                    </SelectItem>
                  ))}
              </SelectPopup>
            </Select>
          </div>
          {paired ? (
            <div className="flex gap-1 lg:hidden">
              <Button
                variant={paired.active === "left" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => activate("left")}
              >
                Left
              </Button>
              <Button
                variant={paired.active === "right" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => activate("right")}
              >
                Right
              </Button>
            </div>
          ) : null}
          {paired ? (
            <Button variant="ghost" size="sm" onClick={close}>
              <XIcon /> Close split
            </Button>
          ) : null}
        </div>
      ) : null}
      {paired && projectKey && ref ? (
        <div
          ref={container}
          className="grid min-h-0 min-w-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,var(--chat-left))_8px_minmax(0,var(--chat-right))]"
          style={
            {
              "--chat-left": `${paired.ratio}fr`,
              "--chat-right": `${1 - paired.ratio}fr`,
            } as import("react").CSSProperties
          }
        >
          <ChatPane
            projectKey={projectKey}
            side="left"
            environmentId={ref.environmentId}
            threadId={paired.left}
            active={paired.active === "left"}
            onActivate={() => activate("left")}
          />
          <div
            role="separator"
            aria-label="Resize conversations"
            aria-orientation="vertical"
            aria-valuemin={30}
            aria-valuemax={70}
            aria-valuenow={Math.round(paired.ratio * 100)}
            tabIndex={0}
            className="hidden cursor-col-resize touch-none lg:block bg-border hover:bg-ring focus-visible:bg-ring focus-visible:outline-none"
            onDoubleClick={() => useProjectChatSplitStore.getState().resize(projectKey, 0.5)}
            onKeyDown={(event) => {
              const delta =
                event.key === "ArrowLeft" ? -0.05 : event.key === "ArrowRight" ? 0.05 : 0;
              if (delta !== 0 || event.key === "Home") {
                event.preventDefault();
                event.stopPropagation();
                useProjectChatSplitStore
                  .getState()
                  .resize(projectKey, event.key === "Home" ? 0.5 : paired.ratio + delta);
              }
            }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              event.preventDefault();
            }}
            onPointerMove={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
              const bounds = container.current?.getBoundingClientRect();
              if (bounds && bounds.width > 0)
                useProjectChatSplitStore
                  .getState()
                  .resize(
                    projectKey,
                    clampChatSplitRatio((event.clientX - bounds.left) / bounds.width),
                  );
            }}
            onPointerUp={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId))
                event.currentTarget.releasePointerCapture(event.pointerId);
            }}
          />
          <ChatPane
            projectKey={projectKey}
            side="right"
            environmentId={ref.environmentId}
            threadId={paired.right}
            active={paired.active === "right"}
            onActivate={() => activate("right")}
          />
        </div>
      ) : (
        <ThreadRouteView embedded target={target} />
      )}
    </SidebarInset>
  );
}
