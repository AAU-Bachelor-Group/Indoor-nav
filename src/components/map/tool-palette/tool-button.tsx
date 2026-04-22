import { Button } from "#/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip"

import type { ReactNode } from "react"

interface ToolButtonProps {
  icon: ReactNode
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  isDefault?: boolean
}

/**
 * Reusable button for the left-hand side tool palette.
 *
 * Active state + tooltip label swap ("Exit …" when pressed) make it obvious
 * which tool is on and how to leave it. Active styling comes from the
 * `floating` button variant's `aria-pressed:` rules — no className toggling.
 */
export const ToolButton = ({
  icon,
  label,
  active,
  disabled,
  onClick,
  isDefault,
}: ToolButtonProps) => (
  <Tooltip>
    <TooltipTrigger
      render={
        <Button
          variant="floating"
          size="icon-xl"
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-pressed={active}
          aria-label={label}
          className="relative"
        >
          {active && (
            <span
              aria-hidden
              className="absolute -left-1 top-2 bottom-2 w-1 rounded-full bg-white"
            />
          )}
          {icon}
        </Button>
      }
    />
    <TooltipContent side="right">
      {active && !isDefault ? `Exit ${label.toLowerCase()}` : label}
    </TooltipContent>
  </Tooltip>
)
