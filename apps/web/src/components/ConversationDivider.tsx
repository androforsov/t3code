import { ArrowLeftRightIcon } from "lucide-react";
import { useRef, useState, type PointerEvent } from "react";

/** A click swaps; dragging from anywhere on the handle resizes without swapping. */
export function ConversationDivider({
  ratio,
  width,
  onResize,
  onSwap,
}: {
  ratio: number;
  width: () => number;
  onResize: (ratio: number) => void;
  onSwap: () => void;
}) {
  const gesture = useRef<{
    x: number;
    y: number;
    ratio: number;
    width: number;
    dragged: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const [dragging, setDragging] = useState(false);
  const pointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    suppressClick.current = false;
    gesture.current = { x: event.clientX, y: event.clientY, ratio, width: width(), dragged: false };
    event.currentTarget.setPointerCapture(event.pointerId);
    if (event.currentTarget.tagName !== "BUTTON") event.preventDefault();
  };
  const pointerMove = (event: PointerEvent<HTMLElement>) => {
    const start = gesture.current;
    if (!start || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const dx = event.clientX - start.x;
    if (!start.dragged && Math.hypot(dx, event.clientY - start.y) < 4) return;
    start.dragged = true;
    suppressClick.current = true;
    setDragging(true);
    if (start.width > 0) onResize(start.ratio + dx / start.width);
  };
  const finish = (event: PointerEvent<HTMLElement>) => {
    gesture.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const pointerHandlers = {
    onPointerDown: pointerDown,
    onPointerMove: pointerMove,
    onPointerUp: finish,
    onPointerCancel: (event: PointerEvent<HTMLElement>) => {
      suppressClick.current = true;
      finish(event);
    },
    onLostPointerCapture: () => {
      gesture.current = null;
      setDragging(false);
    },
  };
  return (
    <div
      className="group relative hidden lg:block"
      data-conversation-divider
      data-dragging={dragging || undefined}
    >
      <div
        role="separator"
        aria-label="Resize conversations"
        aria-orientation="vertical"
        aria-valuemin={15}
        aria-valuemax={85}
        aria-valuenow={Math.round(ratio * 100)}
        tabIndex={0}
        className="h-full cursor-col-resize touch-none outline-none focus-visible:bg-foreground/10"
        {...pointerHandlers}
        onDoubleClick={() => onResize(0.5)}
        onKeyDown={(event) => {
          const delta = event.key === "ArrowLeft" ? -0.05 : event.key === "ArrowRight" ? 0.05 : 0;
          if (delta || event.key === "Home") {
            event.preventDefault();
            event.stopPropagation();
            onResize(event.key === "Home" ? 0.5 : ratio + delta);
          }
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-foreground/10 group-hover:bg-foreground/25 group-data-[dragging]:bg-foreground/35"
      />
      <button
        type="button"
        aria-label="Swap conversation sides"
        data-conversation-swap
        className="absolute left-1/2 top-1/2 z-30 flex h-9 w-7 -translate-x-1/2 -translate-y-1/2 cursor-col-resize touch-none items-center justify-center rounded-lg border border-foreground/15 bg-background text-muted-foreground shadow-sm hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground/50"
        {...pointerHandlers}
        onClick={(event) => {
          if (suppressClick.current && event.detail !== 0) {
            event.preventDefault();
            return;
          }
          onSwap();
        }}
      >
        <ArrowLeftRightIcon className="size-4" aria-hidden />
      </button>
    </div>
  );
}
