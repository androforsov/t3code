import { useMemo } from "react";
import { useClientSettings } from "./useSettings";

/** A local display preference; never changes the thread's project or archive state. */
export function useVisibleProjectChats<T extends { environmentId: string; id: string }>(
  threads: readonly T[],
): T[] {
  const hidden = useClientSettings((settings) => settings.hiddenProjectChatKeys);
  return useMemo(() => {
    const keys = new Set(hidden);
    return threads.filter((thread) => !keys.has(`${thread.environmentId}:${thread.id}`));
  }, [threads, hidden]);
}
