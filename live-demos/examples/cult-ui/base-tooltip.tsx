// cult-ui ships Base Tooltip without a docs page or demo. This renders the unchanged
// component the way its shadcn-style API is used, opened so the card shows the popup.
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../vendor/cult-ui/registry/default/ui/base-tooltip';

export function BaseTooltipExample() {
  return (
    <TooltipProvider>
      <div className="flex h-[160px] items-end justify-center">
        <Tooltip defaultOpen>
          <TooltipTrigger className="border-border bg-background hover:bg-muted rounded-full border px-4 py-2 text-sm font-medium shadow-xs">
            Hover me
          </TooltipTrigger>
          <TooltipContent>Add to library</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
