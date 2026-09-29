import { createContext, useContext, type ReactNode } from "react";

// Read focus at event time. A pointer can activate a pane before React commits its next render.
const alwaysActive = () => true;
export const ChatPaneContext = createContext<() => boolean>(alwaysActive);
export function useIsSplitChatPane() {
  return useContext(ChatPaneContext) !== alwaysActive;
}
export function useChatPaneActive() {
  return useContext(ChatPaneContext);
}

export const ChatPaneCloseControlContext = createContext<ReactNode>(null);
export function useChatPaneCloseControl() {
  return useContext(ChatPaneCloseControlContext);
}
