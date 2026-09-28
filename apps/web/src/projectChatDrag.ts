import type { DragEvent } from "react";
import type { EnvironmentId, ProjectId, ThreadId } from "@t3tools/contracts";
import { create } from "zustand";

export const PROJECT_CHAT_DRAG_TYPE = "application/x-big-dro-project-chat";
export interface ProjectChatDrag {
  id: ThreadId;
  projectId: ProjectId;
  environmentId: EnvironmentId;
  title: string;
}
export const useProjectChatDrag = create<{ chat: ProjectChatDrag | null }>(() => ({ chat: null }));
export const endProjectChatDrag = () => useProjectChatDrag.setState({ chat: null });
export function projectChatDragKey(chat: ProjectChatDrag) {
  return `${chat.environmentId}:${chat.id}`;
}
export function makeProjectChatDragHandlers(chat: ProjectChatDrag) {
  return {
    draggable: true,
    onDragStart(event: DragEvent<HTMLElement>) {
      event.stopPropagation();
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData(PROJECT_CHAT_DRAG_TYPE, projectChatDragKey(chat));
      useProjectChatDrag.setState({
        chat: {
          id: chat.id,
          projectId: chat.projectId,
          environmentId: chat.environmentId,
          title: chat.title,
        },
      });
    },
    onDragEnd: endProjectChatDrag,
  };
}
export function canPlaceProjectChat(
  chat: ProjectChatDrag | null,
  target: { environmentId: EnvironmentId; projectId: ProjectId } | null,
) {
  return (
    chat !== null &&
    (target === null ||
      (chat.environmentId === target.environmentId && chat.projectId === target.projectId))
  );
}
