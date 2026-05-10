import { X } from "lucide-react"
import { useLayoutEffect, useRef, useState } from "react"

import { useIsMobile } from "#/components/hooks/use-is-mobile"
import { Button } from "#/components/ui/button"
import { cn } from "#/lib/utils"

import type { PointerEvent as ReactPointerEvent, ReactNode, RefObject } from "react"

/** Cap the panel at 92% of the visible viewport so a sliver of map peeks above. */
const MAX_HEIGHT_DVH = 92
/**
 * Long enough to cover an iOS keyboard slide (~250ms). While the visual
 * viewport is still animating, transitions are paused so the panel snaps
 * to each frame instead of lagging the keyboard's own animation.
 */
const VIEWPORT_SETTLE_MS = 300
/**
 * CSS custom property exposed on `<html>` while a mobile panel is open,
 * carrying the panel's current visible height (excluding the keyboard
 * pad). Floating UI uses this to offset above the panel:
 *
 *   className="bottom-[calc(0.75rem+var(--mobile-panel-height,0px))]"
 *
 * When multiple panels are open at once, the largest height wins.
 */
const PANEL_HEIGHT_VAR = "--mobile-panel-height"

/**
 * Mobile-only registry of open-panel heights. Keyed by an instance id so
 * multiple panels can be open at once without stomping on each other; the
 * largest height is published to {@link PANEL_HEIGHT_VAR}.
 */
const openPanelHeights = new Map<symbol, number>()
const publishPanelHeight = () => {
  if (typeof document === "undefined") return
  let max = 0
  for (const v of openPanelHeights.values()) max = Math.max(max, v)
  document.documentElement.style.setProperty(PANEL_HEIGHT_VAR, `${max}px`)
}

export type PanelSize =
  /** Fit body content (capped at 92dvh). The default. */
  | "auto"
  /** Full 92dvh of the visible viewport. */
  | "full"
  /** Halfway between `min` and `full`. */
  | "half"
  /** Chrome only (handle + header + footer). Body hidden. */
  | "min"

interface PanelProps {
  /** Whether the panel is visible. Animates in/out. */
  open: boolean
  /** Sticky header (always visible while open). */
  header?: ReactNode
  /** Sticky footer (always visible while open). */
  footer?: ReactNode
  /** Scrollable body content. If omitted, the mobile drag handle is hidden. */
  children?: ReactNode
  /** Renders an X button in the header corner that calls this when clicked. */
  onClose?: () => void
  /**
   * Mobile-only initial size. Drag UI overrides this until release; on
   * release the panel snaps to the nearest of `min` / `half` / `full`.
   * Changing this prop while open re-snaps to the new size. Default `full`.
   * Desktop is always full-height.
   */
  size?: PanelSize
  /**
   * Optional ref to the body element (for callers that need to read or
   * control the body's scroll position).
   */
  snappedToCollapse?: boolean
  bodyRef?: RefObject<HTMLDivElement>
}

/**
 * Shared overlay panel.
 *
 * - **Desktop (≥ md):** anchored to the right edge, full viewport height.
 *   Header pinned top, footer pinned bottom, body scrolls if it overflows.
 * - **Mobile (< md):** bottom sheet at one of three sizes (`full` / `half`
 *   / `min`). The drag handle lets the user resize freely; on release the
 *   sheet snaps to the nearest size. When the on-screen keyboard opens,
 *   the sheet stays anchored to the screen edge so its background extends
 *   behind the keyboard, with bottom padding pushing content above it.
 *
 * The body is the only scroll container — header and footer stay fixed.
 */
export const Panel = ({
  open,
  header,
  footer,
  children,
  onClose,
  size = "auto",
  snappedToCollapse = false,
  bodyRef: externalBodyRef,
}: PanelProps) => {
  const isMobile = useIsMobile()

  const handleRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)
  const internalBodyRef = useRef<HTMLDivElement>(null)
  const bodyRef = externalBodyRef ?? internalBodyRef
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null)
  const idRef = useRef<symbol>(Symbol("panel"))

  // Live measurements (handle + header + footer + body content),
  // kept in sync via ResizeObserver. `content` is the body's scrollHeight,
  // used only to derive `auto` size — `full`, `half`, `min` are all
  // content-independent so panels with content-driven sizing don't infect
  // panels that want a fixed snap.
  const [chrome, setChrome] = useState({ handle: 0, header: 0, footer: 0, content: 0 })

  // Visual viewport tracking. `height` is the area not covered by the
  // on-screen keyboard or browser UI; `keyboard` is how many pixels the
  // keyboard hides at the bottom of the layout viewport (0 when none).
  const [viewport, setViewport] = useState(() => ({
    height: typeof globalThis.innerHeight === "number" ? globalThis.innerHeight : 0,
    keyboard: 0,
  }))
  // Briefly true after each viewport change so transitions can be paused
  // while the keyboard is still sliding. Re-enables on its own.
  const [viewportSettling, setViewportSettling] = useState(false)

  // User-driven height (drag in progress, or last snap target). `null` =
  // "use the default for the current `size` prop".
  const [heightPx, setHeightPx] = useState<number | null>(null)

  // ---------- Snap heights -----------------------------------------------
  const chromePx = chrome.handle + chrome.header + chrome.footer
  /** `full`: 92% of the visible viewport. */
  const fullPx = (viewport.height * MAX_HEIGHT_DVH) / 100
  /** `min`: chrome only (no body). */
  const minPx = chromePx
  /** `half`: midpoint between `min` and `full`. */
  const halfPx = (chrome.handle + fullPx) / 2
  /** `auto`: fits body content, clamped to [min, full]. */
  const autoPx = Math.min(Math.max(chromePx + chrome.content, minPx), fullPx)
  const heightOf = (s: PanelSize) =>
    s === "full" ? fullPx : s === "min" ? minPx : s === "half" ? halfPx : autoPx

  // ---------- Derived-state pattern (no effect) --------------------------
  // React once when a prop transitions, never on every render. An effect
  // here would re-fire whenever the snap heights shift (e.g. each keyboard
  // frame), causing visible jitter as the panel re-snapped.
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setHeightPx(null) // restore caller's `size` for the new session
  }
  const [prevSize, setPrevSize] = useState(size)
  if (size !== prevSize) {
    setPrevSize(size)
    if (isMobile) setHeightPx(heightOf(size))
  }

  // ---------- Effective sizing -------------------------------------------
  const targetHeight = heightPx ?? heightOf(size)
  // Clamp so a stale heightPx (set before the viewport shrank) never
  // pushes the header off-screen.
  const visibleHeight = Math.min(targetHeight, fullPx)
  // Keyboard handling, mobile only and only for the open panel: the sheet
  // stays anchored at `bottom: 0` so its background covers the area behind
  // the keyboard. Total height grows by the keyboard inset; matching
  // `padding-bottom` keeps the chrome above the keyboard. Closed panels
  // skip this so off-screen sheets don't repaint per keyboard frame.
  const keyboardPx = open ? viewport.keyboard : 0
  const totalHeight = visibleHeight + keyboardPx

  // ---------- DOM observation effects ------------------------------------
  useLayoutEffect(() => {
    const measure = () => {
      setChrome({
        handle: handleRef.current?.offsetHeight ?? 0,
        header: headerRef.current?.offsetHeight ?? 0,
        footer: footerRef.current?.offsetHeight ?? 0,
        content: bodyRef.current?.scrollHeight ?? 0,
      })
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
  }, [header, footer, children, bodyRef])

  useLayoutEffect(() => {
    // visualViewport.height shrinks when the on-screen keyboard opens.
    // We also derive the keyboard inset from it. The `scroll` event covers
    // pinch-zoom changes that don't trigger `resize`. innerHeight does not
    // always update on older iOS, so fall back to it only when
    // visualViewport is missing.
    let prevHeight: number | null = null
    let settleTimer: ReturnType<typeof setTimeout> | null = null
    const sync = () => {
      const vv = window.visualViewport
      const innerH = window.innerHeight
      const height = vv?.height ?? innerH
      const keyboard = vv ? Math.max(0, innerH - (vv.offsetTop + vv.height)) : 0
      if (prevHeight !== null && prevHeight !== height) {
        setViewportSettling(true)
        if (settleTimer !== null) clearTimeout(settleTimer)
        settleTimer = setTimeout(() => {
          setViewportSettling(false)
        }, VIEWPORT_SETTLE_MS)
      }
      prevHeight = height
      setViewport({ height, keyboard })
    }
    sync()
    window.addEventListener("resize", sync)
    window.visualViewport?.addEventListener("resize", sync)
    window.visualViewport?.addEventListener("scroll", sync)
    return () => {
      window.removeEventListener("resize", sync)
      window.visualViewport?.removeEventListener("resize", sync)
      window.visualViewport?.removeEventListener("scroll", sync)
      if (settleTimer !== null) clearTimeout(settleTimer)
    }
  }, [])

  // Publish the open mobile panel's visible height as a CSS custom
  // property so floating UI (compass, floor selector, etc.) can offset
  // above it.
  useLayoutEffect(() => {
    const id = idRef.current
    if (isMobile && open) {
      openPanelHeights.set(id, visibleHeight)
    } else {
      openPanelHeights.delete(id)
    }
    publishPanelHeight()
    return () => {
      openPanelHeights.delete(id)
      publishPanelHeight()
    }
  }, [isMobile, open, visibleHeight])

  // ---------- Drag handlers ----------------------------------------------
  const onDragStart = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = { startY: e.clientY, startHeight: visibleHeight }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onDragMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag) return
    const dy = e.clientY - drag.startY
    setHeightPx(Math.max(minPx, Math.min(drag.startHeight - dy, fullPx)))
  }
  const onDragEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    dragRef.current = null
    e.currentTarget.releasePointerCapture(e.pointerId)
    // Snap to the closest of (min, auto, full). `auto` is the
    // content-fit middle point; for tall content it collapses into `full`,
    // for short content into `min`, leaving 1–3 effective stops.
    const snaps = [minPx, autoPx, fullPx]
    const nearest = snaps.reduce((best, px) =>
      Math.abs(px - visibleHeight) < Math.abs(best - visibleHeight) ? px : best,
    )
    setHeightPx(nearest)
  }

  const [prevSnappedToCollapse, setPrevSnappedToCollapse] = useState(snappedToCollapse)
  if (snappedToCollapse !== prevSnappedToCollapse) {
    setPrevSnappedToCollapse(snappedToCollapse)
    if (isMobile && snappedToCollapse) {
      setHeightPx(halfPx)
    }
  }

  return (
    <aside
      aria-hidden={!open}
      style={
        isMobile ? { height: `${totalHeight}px`, paddingBottom: `${keyboardPx}px` } : undefined
      }
      className={cn(
        "fixed z-30 flex flex-col overflow-hidden bg-popover text-popover-foreground shadow-2xl",
        // Only `transform` transitions — the open/close slide. Height is
        // updated live and never animated: a transition there would chase
        // every ResizeObserver fire (content settling, fonts loading, snap
        // changes during a keyboard slide), causing the panel to "sink" a
        // few pixels at a time after open. Snap-on-release is therefore
        // instant, which feels responsive.
        !viewportSettling && "transition-transform duration-300 ease-in-out",
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
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
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
      {/*
        The body is itself a flex column so callers can place fixed
        sections (e.g. a search field row at the top) and a scrollable
        section (e.g. a result list) as direct children with `shrink-0`
        and `flex-1 min-h-0 overflow-y-auto`. We avoid an inner `h-full`
        wrapper because iOS Safari treats the height of a `flex-1` parent
        as indefinite, so percentage-height children collapse to 0 — the
        navigation panel's results were vanishing on real devices for
        exactly this reason. Block-content callers still work: a single
        block child becomes one flex item with its natural height, and
        the body's own `overflow-y-auto` covers it if it's too tall.
      */}
      <div ref={bodyRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {children}
      </div>
      <div ref={footerRef} className="shrink-0">
        {footer}
      </div>
    </aside>
  )
}
