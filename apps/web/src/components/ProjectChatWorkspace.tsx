import {
  canPlaceProjectChat,
  endProjectChatDrag,
  projectChatDragKey,
  PROJECT_CHAT_DRAG_TYPE,
  useProjectChatDrag,
} from "../projectChatDrag";
import { ConversationDivider } from "./ConversationDivider";
import { useVisibleProjectChats } from "../hooks/useVisibleProjectChats";
import { ComposerHandleContext, useComposerHandleContext } from "../composerHandleContext";
import { createPaneComposerHandle } from "./chat/paneComposerHandle";
import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import type { EnvironmentId, ThreadId } from "@t3tools/contracts";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeftRightIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";

import { useThreadShell, useThreadShells } from "../state/entities";
import { buildThreadRouteParams, type ThreadRouteTarget } from "../threadRoutes";
import {
  followThreadInSplit,
  useProjectChatSplitStore,
  type ChatPaneSide,
} from "../projectChatSplitStore";
import { ThreadRouteView } from "./ThreadRouteView";
import { ChatPaneContext, ChatPaneCloseControlContext } from "./chat/ChatPaneContext";
import { Button } from "./ui/button";
import { SidebarInset } from "./ui/sidebar";

function ChatPane({
  projectKey,
  side,
  environmentId,
  threadId,
  active,
  onActivate,
  onClose,
}: {
  projectKey: string;
  side: ChatPaneSide;
  environmentId: EnvironmentId;
  threadId: ThreadId;
  active: boolean;
  onActivate: () => void;
  onClose: () => void;
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
      className={`h-full min-h-0 min-w-0 flex-col overflow-hidden ${active ? "flex" : "hidden lg:flex"}`}
    >
      <ChatPaneCloseControlContext
        value={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Close ${side} conversation pane`}
            onClick={onClose}
          >
            <XIcon />
          </Button>
        }
      >
        <ChatPaneContext value={isActive}>
          <ComposerHandleContext value={composer.ref}>
            <ThreadRouteView
              embedded
              target={{ kind: "server", threadRef: scopeThreadRef(environmentId, threadId) }}
            />
          </ComposerHandleContext>
        </ChatPaneContext>
      </ChatPaneCloseControlContext>
    </section>
  );
}

/** Two existing threads in one project; execution and mobile contracts remain unchanged. */
export function ProjectChatWorkspace({ target }: { target: ThreadRouteTarget }) {
  const navigate = useNavigate();
  const ref = target.kind === "server" ? target.threadRef : null;
  const current = useThreadShell(ref);
  const threads = useVisibleProjectChats(useThreadShells());
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
  const close = () => {
    if (projectKey) useProjectChatSplitStore.getState().close(projectKey);
  };

  const draggedChat = useProjectChatDrag((state) => state.chat);
  const [dropSide, setDropSide] = useState<ChatPaneSide | null>(null);
  const eligibleChat = (chat: typeof draggedChat) =>
    canPlaceProjectChat(chat, current) &&
    threads.some(
      (thread) =>
        thread.id === chat?.id &&
        thread.environmentId === chat.environmentId &&
        thread.archivedAt === null,
    );
  const dropEligible = eligibleChat(draggedChat);
  const isChatDrag = (event: DragEvent<HTMLElement>) =>
    event.dataTransfer.types.includes(PROJECT_CHAT_DRAG_TYPE);
  const sideAt = (event: DragEvent<HTMLElement>): ChatPaneSide => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return event.clientX < bounds.left + bounds.width * (paired?.ratio ?? 0.5) ? "left" : "right";
  };
  const dragOver = (event: DragEvent<HTMLElement>) => {
    if (!isChatDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    const eligible = eligibleChat(useProjectChatDrag.getState().chat);
    event.dataTransfer.dropEffect = eligible ? "move" : "none";
    setDropSide(eligible ? sideAt(event) : null);
  };
  const dropChat = (event: DragEvent<HTMLElement>) => {
    if (!isChatDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();
    const side = sideAt(event);
    // Native drag events can finish before React commits the drag-start render.
    const dropped = useProjectChatDrag.getState().chat;
    if (
      dropped &&
      eligibleChat(dropped) &&
      event.dataTransfer.getData(PROJECT_CHAT_DRAG_TYPE) === projectChatDragKey(dropped)
    ) {
      if (current && projectKey)
        useProjectChatSplitStore.getState().place(projectKey, current.id, dropped.id, side);
      void navigate({
        to: "/$environmentId/$threadId",
        params: buildThreadRouteParams(scopeThreadRef(dropped.environmentId, dropped.id)),
      });
    }
    setDropSide(null);
    endProjectChatDrag();
  };
  const closePane = (side: ChatPaneSide) => {
    if (!paired || !ref) return;
    const keep = paired[side === "left" ? "right" : "left"];
    close();
    void navigate({
      to: "/$environmentId/$threadId",
      params: buildThreadRouteParams(scopeThreadRef(ref.environmentId, keep)),
    });
  };
  return (
    <SidebarInset
      className="relative h-svh min-h-0 overflow-hidden overscroll-y-none md:h-dvh"
      onDragOverCapture={dragOver}
      onDropCapture={dropChat}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropSide(null);
      }}
    >
      {draggedChat && dropEligible ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-60 grid"
          style={{
            gridTemplateColumns: `${paired?.ratio ?? 0.5}fr ${1 - (paired?.ratio ?? 0.5)}fr`,
          }}
        >
          {(["left", "right"] as const).map((side) => (
            <div
              key={side}
              className={`m-2 flex items-center justify-center rounded-xl border border-dashed border-foreground/25 transition-colors ${dropSide === side ? "bg-foreground/15" : "bg-background/35"}`}
            >
              <span className="rounded-lg border border-border bg-background px-4 py-2 text-sm">
                {paired ? "Place chat on" : "Open chat on"} the {side}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      {paired ? (
        <div className="flex shrink-0 items-center justify-end gap-2 border-b border-border bg-background px-3 py-2 lg:hidden [-webkit-app-region:no-drag]">
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
          {paired && projectKey ? (
            <div className="lg:hidden">
              <Button
                variant="ghost"
                size="sm"
                aria-label="Swap conversation sides"
                onClick={() => useProjectChatSplitStore.getState().swap(projectKey)}
              >
                <ArrowLeftRightIcon />
                Swap
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
            key={paired.left}
            projectKey={projectKey}
            side="left"
            environmentId={ref.environmentId}
            threadId={paired.left}
            active={paired.active === "left"}
            onActivate={() => activate("left")}
            onClose={() => closePane("left")}
          />
          <ConversationDivider
            key="divider"
            ratio={paired.ratio}
            width={() => container.current?.getBoundingClientRect().width ?? 0}
            onResize={(ratio) => useProjectChatSplitStore.getState().resize(projectKey, ratio)}
            onSwap={() => useProjectChatSplitStore.getState().swap(projectKey)}
          />
          <ChatPane
            key={paired.right}
            projectKey={projectKey}
            side="right"
            environmentId={ref.environmentId}
            threadId={paired.right}
            active={paired.active === "right"}
            onActivate={() => activate("right")}
            onClose={() => closePane("right")}
          />
        </div>
      ) : (
        <ThreadRouteView embedded target={target} />
      )}
    </SidebarInset>
  );
}
