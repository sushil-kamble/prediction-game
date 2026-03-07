import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "#/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-[0_12px_32px_rgba(139,92,246,0.3)] hover:shadow-[0_16px_40px_rgba(139,92,246,0.4)] hover:brightness-110 active:scale-[0.98]",
        destructive:
          "bg-gradient-to-br from-rose-500 to-red-700 text-white shadow-[0_12px_32px_rgba(239,68,68,0.25)] hover:brightness-110 active:scale-[0.98]",
        outline:
          "border border-border bg-secondary text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground active:scale-[0.98]",
        secondary:
          "border border-border bg-secondary text-secondary-foreground hover:bg-accent active:scale-[0.98]",
        ghost:
          "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2",
        xs: "h-7 gap-1 rounded-lg px-2.5 text-xs",
        sm: "h-9 gap-1.5 rounded-lg px-3.5",
        lg: "h-12 rounded-xl px-7 text-base",
        icon: "size-11",
        "icon-sm": "size-9 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
