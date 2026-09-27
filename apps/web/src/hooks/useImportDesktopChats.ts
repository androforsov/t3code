import { useRef, useState } from "react";
import type { EnvironmentId, ProjectId } from "@t3tools/contracts";
import { agentSessionImport } from "../state/agentSessions";
import { useAtomCommand } from "../state/use-atom-command";
import { toastManager } from "../components/ui/toast";

export function useImportDesktopChats() {
  const importThreads = useAtomCommand(agentSessionImport);
  const busy = useRef(false);
  const [isImporting, setIsImporting] = useState(false);
  const findChats = async (project: {
    environmentId: EnvironmentId;
    id: ProjectId;
    workspaceRoot: string;
  }) => {
    if (busy.current) return;
    busy.current = true;
    setIsImporting(true);
    try {
      const result = await importThreads({
        environmentId: project.environmentId,
        input: {
          projectId: project.id,
          expectedWorkspaceRoot: project.workspaceRoot,
          refreshTitles: true,
        },
      });
      if (result._tag === "Success") {
        const { importedCount, skippedCount } = result.value;
        toastManager.add({
          type: skippedCount > 0 ? "warning" : "success",
          title: "Desktop chats checked",
          description: `${importedCount} chats available, including previous imports. ${skippedCount > 0 ? `${skippedCount} transcript files could not be imported. ` : ""}Existing conversations are snapshots; this does not resume or live-sync them.`,
        });
      }
    } finally {
      busy.current = false;
      setIsImporting(false);
    }
  };
  return { findChats, isImporting };
}
