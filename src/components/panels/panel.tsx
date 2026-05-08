import { X } from "lucide-react"
import { useEffect, useLayoutEffect, useRef, useState } from "react"

import { useIsMobile } from "#/components/hooks/use-is-mobile"
import { Button } from "#/components/ui/button"
import { cn } from "#/lib/utils"

import type { PointerEvent as ReactPointerEvent, ReactNode } from "react"

const MAX_HEIGHT_DVH = 92

interface PanelProps {
  /** Whether the panel is visible. Animates in/out. */
  open: boolean
  /** Sticky header. Always visible while the panel is open. */
  header?: ReactNode
  /** Sticky footer. Always visible while the panel is open. */
  footer?: ReactNode
  /** Scrollable body content. If omitted, the mobile drag handle is hidden. */
  children?: ReactNode
  /** Called when the user clicks the built-in close button. Omit to hide it. */
  onClose?: () => void
  /**
   * Mobile only: when true, the bottom sheet opens at its expanded snap
   * (full content / 92dvh cap) instead of the default header-only snap.
   * The drag handle is still available so the user can swipe down to a
   * header-only minimum either way. Desktop is always full-height.
   */
  fullHeight?: boolean
}

/**
 * Shared overlay panel used across the map UI.
 *
 * Layout (header + body + footer always rendered in that order):
 * - **Desktop (≥ md):** anchored to the right edge, full viewport height.
 *   Header pinned top, footer pinned bottom, body scrolls if it overflows.
 * - **Mobile (< md):** bottom sheet with two snap points:
 *   - **collapsed**: handle + header + footer (body hidden). Always shows
 *     the title and the primary action.
 *   - **expanded**: natural content height, capped at 92dvh; or the full
 *     viewport when `fullHeight`.
 *   Drag the handle to move between them; release picks the nearest snap.
 *   `fullHeight` controls which snap the sheet opens at — collapsed by
 *   default, expanded when set.
 */
export const Panel = ({
  open,
  header,
  footer,
  children,
  onClose,
  fullHeight = false,
}: PanelProps) => {
  const isMobile = useIsMobile()
  const handleRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  const [handlePx, setHandlePx] = useState(0)
  const [headerPx, setHeaderPx] = useState(0)
  const [footerPx, setFooterPx] = useState(0)
  const [contentPx, setContentPx] = useState(0)
  const [viewportPx, setViewportPx] = useState(() =>
    typeof globalThis.innerHeight === "number" ? globalThis.innerHeight : 0,
  )
  const [heightPx, setHeightPx] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)
  const [prevOpen, setPrevOpen] = useState(open)
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null)

  useLayoutEffect(() => {
    const measure = () => {
      setHandlePx(handleRef.current?.offsetHeight ?? 0)
      setHeaderPx(headerRef.current?.offsetHeight ?? 0)
      setFooterPx(footerRef.current?.offsetHeight ?? 0)
      setContentPx(bodyRef.current?.scrollHeight ?? 0)
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (handleRef.current) ro.observe(handleRef.current)
    if (headerRef.current) ro.observe(headerRef.current)
    if (footerRef.current) ro.observe(footerRef.current)
    if (bodyRef.current) ro.observe(bodyRef.current)
    return () => {
      ro.disconnect()
    }
  }, [header, footer, children])

  useLayoutEffect(() => {
    // visualViewport.height shrinks when the iOS keyboard opens; innerHeight
    // does not always update on older iOS, causing the panel to overflow.
    const update = () => {
      setViewportPx(window.visualViewport?.height ?? window.innerHeight)
    }
    update()
    window.addEventListener("resize", update)
    window.visualViewport?.addEventListener("resize", update)
    return () => {
      window.removeEventListener("resize", update)
      window.visualViewport?.removeEventListener("resize", update)
    }
  }, [])

  const maxPx = (viewportPx * MAX_HEIGHT_DVH) / 100
  // Snap points: collapsed (chrome only — title + primary action stay visible)
  // and expanded (natural content height capped at 92dvh, or the full cap for
  // fullHeight panels).
  const collapsedPx = handlePx + headerPx + footerPx
  const naturalPx = collapsedPx + contentPx
  const expandedPx = fullHeight ? maxPx : Math.min(naturalPx, maxPx)
  const snapMidPx = (collapsedPx + expandedPx) / 2

  // On open, clear any drag-locked height so the live default snap (driven
  // by the fallback below) takes over. Releases stale measurements that
  // would otherwise capture a 0-height footer before it had a chance to
  // mount. (Derived-state pattern — runs during render, no effect.)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setHeightPx(null)
  }

  // Always clamp to expandedPx so a stale heightPx (set before the keyboard
  // opened and shrank the viewport) never pushes the panel header off-screen.
  const currentHeight = Math.min(heightPx ?? (fullHeight ? expandedPx : collapsedPx), expandedPx)

  // Track panel height as a CSS variable so the map controls can shift above
  // it on mobile. Capped at 55dvh so buttons stay on-screen even when the
  // panel is nearly full-screen.
  useEffect(() => {
    if (!isMobile) return
    const height = open ? Math.min(currentHeight, viewportPx * 0.55) : 0
    document.documentElement.style.setProperty("--mobile-panel-height", `${height}px`)
    return () => { document.documentElement.style.setProperty("--mobile-panel-height", "0px"); }
  }, [isMobile, open, currentHeight, viewportPx])

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = { startY: e.clientY, startHeight: currentHeight }
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    const dy = e.clientY - drag.startY
    setHeightPx(Math.max(collapsedPx, Math.min(drag.startHeight - dy, expandedPx)))
  }

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    dragRef.current = null
    e.currentTarget.releasePointerCapture(e.pointerId)
    setDragging(false)
    setHeightPx(currentHeight > snapMidPx ? expandedPx : collapsedPx)
  }

  return (
    <aside
      aria-hidden={!open}
      style={isMobile ? { height: `${currentHeight}px` } : undefined}
      className={cn(
        "fixed z-30 flex flex-col overflow-hidden bg-popover text-popover-foreground shadow-2xl",
        "transition-transform duration-300 ease-in-out",
        !dragging && "transition-[transform,height]",
        // mobile: bottom sheet
        "inset-x-0 bottom-0 rounded-t-2xl border-t border-border",
        // desktop: right-anchored full-height (overrides the mobile shape)
        "md:inset-x-auto md:bottom-auto md:top-0 md:right-0 md:h-full md:w-88 md:rounded-none md:border-l",
        open
          ? "translate-y-0 md:translate-x-0"
          : "pointer-events-none translate-y-full md:translate-y-0 md:translate-x-full",
      )}
    >
      {children != null && (
        <div
          ref={handleRef}
          className="flex shrink-0 cursor-grab touch-none items-center justify-center py-2 active:cursor-grabbing md:hidden"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
        </div>
      )}
      <div ref={headerRef} className="relative shrink-0">
        {header}
        {onClose && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Close"
            onClick={onClose}
            className="absolute top-3 right-3 text-popover-foreground hover:bg-white/10 hover:text-popover-foreground"
          >
            <X />
          </Button>
        )}
      </div>
      <div
        ref={bodyRef}
        className={cn(
          "min-h-0 flex-1",
          // On mobile, only enable scroll when the visible body area is
          // actually shorter than its content. Otherwise touch jitter can
          // scroll a panel that already fits perfectly.
          isMobile && currentHeight - (handlePx + headerPx + footerPx) >= contentPx
            ? "overflow-hidden"
            : "overflow-y-auto",
        )}
      >
        {children}
      </div>
      <div ref={footerRef} className="shrink-0">
        {footer}
      </div>
    </aside>
  )
}
