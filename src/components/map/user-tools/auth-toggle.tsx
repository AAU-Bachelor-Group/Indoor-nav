import { useNavigate } from "@tanstack/react-router"
import { LogIn, LogOut } from "lucide-react"

import { useIsMobile } from "#/components/hooks/use-is-mobile"
import { Button } from "#/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip"
import { authClient } from "#/lib/auth-client"
import { useIsLoggedIn } from "#/lib/auth-hooks"
import { useMap } from "#/lib/map-context"

interface AuthToggleProps {
  className?: string
}

/**
 * Icon button for sign-in / sign-out. When logged out, navigates to /login;
 * when logged in, signs out in place (better-auth's session hook updates
 * reactively, so the icon swaps without a navigation). Hidden during the
 * floor-picker overlay to keep the column from competing with it. The
 * tooltip is suppressed on touch viewports where it would otherwise fire on
 * long-press.
 */
export const AuthToggle = ({ className }: AuthToggleProps) => {
  const { isLoggedIn, isPending } = useIsLoggedIn()
  const { isSelectingFloor } = useMap()
  const isMobile = useIsMobile()
  const navigate = useNavigate()

  if (isPending || isSelectingFloor) return null

  const label = isLoggedIn ? "Sign out" : "Sign in"
  const Icon = isLoggedIn ? LogOut : LogIn

  const button = (
    <Button
      variant="floating"
      size="icon-xl"
      type="button"
      aria-label={label}
      className={className}
      onClick={() => {
        if (isLoggedIn) {
          void authClient.signOut().then(() => {
            globalThis.location.reload()
          })
        } else {
          void navigate({ to: "/login" })
        }
      }}
    >
      <Icon className="size-5" />
    </Button>
  )

  if (isMobile) return button

  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent side="left">{label}</TooltipContent>
    </Tooltip>
  )
}
