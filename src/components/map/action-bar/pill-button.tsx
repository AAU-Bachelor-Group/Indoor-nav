import { Button } from "#/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip"

import type { ReactNode } from "react"

interface PillButtonProps {
  icon: ReactNode
  label: string
  disabled?: boolean
  onClick: () => void
}

/**
 * Icon button rendered inside the ActionBar pill. Uses the shared `toolbar`
 * button variant so hover / pressed styling stays consistent with any other
 * toolbar-style buttons the app adds later.
 */
export const PillButton = ({ icon, label, disabled, onClick }: PillButtonProps) => (
  <Tooltip>
    <TooltipTrigger
      render={
        <Button
          variant="toolbar"
          size="icon-round"
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
        >
          {icon}
        </Button>
      }
    />
    <TooltipContent side="top">{label}</TooltipContent>
  </Tooltip>
)

export const PillDivider = () => <div className="h-6 w-px bg-slate-600/60" aria-hidden />
