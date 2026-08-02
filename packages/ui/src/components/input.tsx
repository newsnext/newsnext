import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@newsnext/ui/lib/utils"

import * as React from "react"

type InputVariant = "default" | "inline"

interface InputProps extends React.ComponentProps<"input"> {
  variant?: InputVariant
}

function Input({
  className,
  type,
  variant = "default",
  ...props
}: InputProps): React.JSX.Element {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      data-variant={variant}
      className={cn(
        "h-9 w-full min-w-0 rounded-3xl border border-input bg-input/30 px-3 py-1 text-base transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        variant === "inline" && "h-6 border-transparent bg-transparent px-2 py-0 text-left text-sm leading-none shadow-none hover:bg-background/40 focus-visible:border-input/50 focus-visible:bg-background/60 focus-visible:ring-1 focus-visible:ring-ring/30",
        className,
      )}
      {...props}
    />
  )
}

export { Input }
export type { InputProps, InputVariant }
