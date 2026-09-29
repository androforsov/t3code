import type { EnvironmentId, ProviderInstanceId } from "@t3tools/contracts";
import { resolveProviderInstanceDisplayName } from "@t3tools/client-runtime/state/provider-instance-display";
import { useServerConfigs } from "../../state/entities";
import { ProviderInstanceIcon } from "./ProviderInstanceIcon";
import { getTriggerDisplayModelLabel } from "./providerIconUtils";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";

export function ChatProviderBadge({
  environmentId,
  instanceId,
  model,
}: {
  environmentId: EnvironmentId;
  instanceId: ProviderInstanceId;
  model: string;
}) {
  const configs = useServerConfigs();
  const provider = configs
    .get(environmentId)
    ?.providers.find((entry) => entry.instanceId === instanceId);
  if (!provider) return null;
  const label = resolveProviderInstanceDisplayName(provider);
  const selected = provider.models.find((entry) => entry.slug === model);
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground [-webkit-app-region:no-drag]"
            data-chat-provider-badge
          />
        }
      >
        <ProviderInstanceIcon
          driverKind={provider.driver}
          displayName={label}
          iconClassName="size-4"
        />
        <span>{label}</span>
      </TooltipTrigger>
      <TooltipPopup>{selected ? getTriggerDisplayModelLabel(selected) : model}</TooltipPopup>
    </Tooltip>
  );
}
