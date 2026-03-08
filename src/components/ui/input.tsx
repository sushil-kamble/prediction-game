import * as React from "react"

import { cn } from "#/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        className={cn(
          "h-11 w-full min-w-0 rounded-xl border border-input bg-secondary/50 px-4 py-2 text-base text-foreground shadow-sm transition-all outline-none placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          "focus-visible:border-primary/50 focus-visible:ring-[3px] focus-visible:ring-ring/20",
          className
        )}
        {...props}
      />
    )
  }
)

Input.displayName = "Input"

export { Input }
