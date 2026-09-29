import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useProjectChatSplitStore } from "../projectChatSplitStore";
import { useThreadShells } from "../state/entities";
import { Tooltip, TooltipPopup, TooltipTrigger } from "./ui/tooltip";

interface Connector {
  projectKey: string;
  top: number;
  height: number;
  label: string;
  partial: boolean;
}

/** One shared rail joins the linked rows, with a single unlink control between them. */
export function LinkedThreadBrackets({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const pairs = useProjectChatSplitStore((state) => state.byProject);
  const threads = useThreadShells();
  const [connectors, setConnectors] = useState<Connector[]>([]);
  useLayoutEffect(() => {
    const host = root.current;
    if (!host) return;
    const titles = new Map(
      threads.map((thread) => [`${thread.environmentId}:${thread.id}`, thread.title]),
    );
    let disposed = false;
    const pendingAnimations = new WeakSet<Animation>();
    const measure = () => {
      if (disposed) return;
      const bounds = host.getBoundingClientRect();
      const rows = new Map(
        Array.from(host.querySelectorAll<HTMLElement>("[data-linked-thread-key]")).map((row) => [
          row.dataset.linkedThreadKey,
          row,
        ]),
      );
      const next: Connector[] = [];
      for (const [projectKey, pair] of Object.entries(pairs)) {
        const environmentId = projectKey.slice(0, projectKey.indexOf(":"));
        const keys = [pair.left, pair.right].map((id) => `${environmentId}:${id}`);
        const centers = keys.flatMap((key) => {
          const row = rows.get(key);
          if (!row) return [];
          const r = row.getBoundingClientRect();
          return r.height > 0 && r.width > 0 ? [r.top - bounds.top + r.height / 2] : [];
        });
        if (!centers.length) continue;
        next.push({
          projectKey,
          top: Math.min(...centers),
          height: Math.max(...centers) - Math.min(...centers),
          partial: centers.length === 1,
          label: `Unlink ${titles.get(keys[0]!) ?? "chat"} and ${titles.get(keys[1]!) ?? "chat"}`,
        });
      }
      setConnectors((previous) =>
        JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
      );
      // Auto-animated reorderings can finish after layout/ResizeObserver callbacks.
      for (const animation of host.getAnimations?.({ subtree: true }) ?? []) {
        if (pendingAnimations.has(animation)) continue;
        pendingAnimations.add(animation);
        void animation.finished.then(measure, () => {});
      }
    };
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(host);
    for (const row of host.querySelectorAll<HTMLElement>("[data-linked-thread-key]"))
      resize.observe(row);
    const mutation = new MutationObserver(measure);
    mutation.observe(host, { childList: true, subtree: true });
    host.addEventListener("transitionend", measure);
    return () => {
      disposed = true;
      resize.disconnect();
      mutation.disconnect();
      host.removeEventListener("transitionend", measure);
    };
  }, [pairs, threads]);
  return (
    <div
      ref={root}
      className={`relative min-w-0 ${connectors.length ? "pr-8" : ""}`}
      data-linked-thread-brackets
    >
      {children}
      {connectors.map((connector) => (
        <div
          key={connector.projectKey}
          className="pointer-events-none absolute right-0 w-8"
          style={{ top: connector.top, height: connector.height }}
          data-linked-thread-connector
        >
          <svg
            aria-hidden
            className="absolute inset-0 h-full w-full overflow-visible text-sidebar-border"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          >
            {connector.partial ? (
              <path d="M 0 0 H 7" />
            ) : (
              <path
                d={`M 0 0 H 18 V ${Math.max(0, connector.height / 2 - 12)} M 18 ${Math.min(connector.height, connector.height / 2 + 12)} V ${connector.height} H 0`}
              />
            )}
          </svg>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  aria-label={connector.label}
                  data-thread-selection-safe
                  className="pointer-events-auto absolute right-0 flex size-7 -translate-y-1/2 items-center justify-center rounded-md bg-transparent text-sidebar-foreground/75 hover:text-sidebar-foreground focus-visible:outline-2 focus-visible:outline-foreground/60"
                  style={{ top: "50%" }}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    useProjectChatSplitStore.getState().close(connector.projectKey);
                  }}
                >
                  <svg
                    className="size-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="m14.5 5.5 1.4-1.4a4 4 0 0 1 5.6 5.6l-2.8 2.8M9.5 18.5l-1.4 1.4a4 4 0 0 1-5.6-5.6l2.8-2.8M9 15l2-2m2-2 2-2M3 3l18 18" />
                  </svg>
                </button>
              }
            />
            <TooltipPopup side="right">
              {connector.label}
              {connector.partial ? " (other chat is not shown)" : ""}
            </TooltipPopup>
          </Tooltip>
        </div>
      ))}
    </div>
  );
}
