import { ConversationDivider } from "./ConversationDivider";
import { useVisibleProjectChats } from "../hooks/useVisibleProjectChats";
import { resolveProviderInstanceDisplayName } from "@t3tools/client-runtime/state/provider-instance-display";
import { ProviderInstanceIcon } from "./chat/ProviderInstanceIcon";
import { ComposerHandleContext, useComposerHandleContext } from "../composerHandleContext";
import { createPaneComposerHandle } from "./chat/paneComposerHandle";
import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import type { EnvironmentId, ThreadId } from "@t3tools/contracts";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeftRightIcon, Columns2Icon, XIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { useThreadShell, useThreadShells, useServerConfigs } from "../state/entities";
import { buildThreadRouteParams, type ThreadRouteTarget } from "../threadRoutes";
import {
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
  onReplace,
  choices,
  peerThreadId,
}: {
  projectKey: string;
  side: ChatPaneSide;
  environmentId: EnvironmentId;
  threadId: ThreadId;
  active: boolean;
  onActivate: () => void;
  onReplace: (id: ThreadId) => void;
  choices: ReadonlyArray<{ id: ThreadId; title: string }>;
  peerThreadId: ThreadId;
}) {
  const thread = useThreadShell(scopeThreadRef(environmentId, threadId));
  const configs = useServerConfigs();
  const provider = configs
    .get(environmentId)
    ?.providers.find((entry) => entry.instanceId === thread?.modelSelection.instanceId);
  const providerLabel = provider ? resolveProviderInstanceDisplayName(provider) : "Agent";
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
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border bg-background px-3 [-webkit-app-region:no-drag]">
        {provider ? (
          <ProviderInstanceIcon
            driverKind={provider.driver}
            displayName={providerLabel}
            iconClassName="size-4"
          />
        ) : null}
        <span className="text-xs text-muted-foreground">{providerLabel}</span>
        <div className="min-w-0 flex-1">
          <Select
            value={threadId}
            onValueChange={(value) => {
              if (value) onReplace(value as ThreadId);
            }}
          >
            <SelectTrigger aria-label={`Choose ${side} conversation`} size="sm">
              <SelectValue>{thread?.title ?? "Choose a conversation"}</SelectValue>
            </SelectTrigger>
            <SelectPopup>
              {choices
                .filter((choice) => choice.id !== peerThreadId)
                .map((choice) => (
                  <SelectItem key={choice.id} value={choice.id}>
                    {choice.title}
                  </SelectItem>
                ))}
            </SelectPopup>
          </Select>
        </div>
        {thread?.session?.status === "running" ? (
          <span className="text-xs text-muted-foreground">Working</span>
        ) : null}
      </div>
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
  const openBeside = (threadId: ThreadId) => {
    if (!projectKey || !current || !available.has(threadId) || threadId === current.id) return;
    useProjectChatSplitStore.getState().open(projectKey, current.id, threadId);
    void navigate({
      to: "/$environmentId/$threadId",
      params: buildThreadRouteParams(scopeThreadRef(current.environmentId, threadId)),
    });
  };
  const replace = (side: ChatPaneSide, threadId: ThreadId) => {
    if (!projectKey || !current || !paired || !available.has(threadId)) return;
    if (paired[side === "left" ? "right" : "left"] === threadId) return;
    useProjectChatSplitStore.getState().replace(projectKey, side, threadId);
    void navigate({
      to: "/$environmentId/$threadId",
      params: buildThreadRouteParams(scopeThreadRef(current.environmentId, threadId)),
      replace: true,
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
            onReplace={(id) => replace("left", id)}
            choices={projectThreads}
            peerThreadId={paired.right}
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
            onReplace={(id) => replace("right", id)}
            choices={projectThreads}
            peerThreadId={paired.left}
          />
        </div>
      ) : (
        <ThreadRouteView embedded target={target} />
      )}
    </SidebarInset>
  );
}
