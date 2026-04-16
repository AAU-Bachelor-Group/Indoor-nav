import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "#/lib/utils"

const buttonVariants = cva(
  "font-serif cursor-pointer font-bold group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "font-bold bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          "border-primary hover:bg-gray-100 font-bold bg-background shadow-xs hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50 text-primary",
        secondary:
          "font-bold bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "font-bold hover:bg-muted hover:text-foreground hover:underline aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "font-bold bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
        /**
         * Button that floats over the map surface. Dark fill, white text,
         * elevated shadow. Toggle state is driven by the ARIA attribute:
         * pass `aria-pressed` to get the active styling, no extra classes
         * needed. Used by the tool palette, compass, render-mode/debug
         * toggles, and floor selector.
         */
        floating:
          "bg-primary text-white hover:bg-primary/80 backdrop-blur-sm shadow-xl border border-slate-700/50 rounded-2xl aria-pressed:bg-secondary aria-pressed:ring-2 aria-pressed:ring-white/70",
        /**
         * Button rendered inside a container (e.g. the bottom action-bar
         * pill). Transparent by default so buttons visually belong to their
         * parent; highlights on hover; aria-pressed for toggles.
         */
        toolbar:
          "text-white hover:bg-secondary rounded-full aria-pressed:bg-secondary aria-pressed:ring-2 aria-pressed:ring-white/50",
      },
      size: {
        default:
          "h-9 gap-2 px-5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),8px)] px-2 text-xs in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 rounded-[min(var(--radius-md),10px)] px-2.5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5",
        lg: "h-10 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-9",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),8px)] in-data-[slot=button-group]:rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-8 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-md",
        "icon-lg": "size-10",
        /** 56×56, for the map's floating buttons. */
        "icon-xl": "size-14",
        /** 44×44, for round buttons inside a toolbar/pill container. */
        "icon-round": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
