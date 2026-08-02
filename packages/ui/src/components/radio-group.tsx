import { Radio as RadioPrimitive } from "@base-ui/react/radio"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"

import { cn } from "@newsnext/ui/lib/utils"
import { createContext, use } from "react"

type RadioGroupVariant = "default" | "palette" | "segmented"

const RadioGroupVariantContext = createContext<RadioGroupVariant>("default")

function RadioGroup<Value>({
  className,
  variant = "default",
  children,
  ...props
}: RadioGroupPrimitive.Props<Value> & { variant?: RadioGroupVariant }): React.JSX.Element {
  return (
    <RadioGroupVariantContext value={variant}>
      <RadioGroupPrimitive
        data-slot="radio-group"
        data-variant={variant}
        className={cn(
          variant === "default" && "grid w-full gap-3",
          variant === "palette" && "grid h-full w-full grid-cols-[repeat(6,2rem)] place-content-center gap-2",
          variant === "segmented" && "island-pill flex w-fit items-center gap-2 rounded-full p-1",
          className,
        )}
        {...props}
      >
        {children}
      </RadioGroupPrimitive>
    </RadioGroupVariantContext>
  )
}

function RadioGroupItem<Value>({
  className,
  children,
  ...props
}: RadioPrimitive.Root.Props<Value>): React.JSX.Element {
  const variant = use(RadioGroupVariantContext)

  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      data-variant={variant}
      className={cn(
        variant === "default" && "group/radio-group-item peer relative flex aspect-square size-4 shrink-0 rounded-full border border-input outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary",
        variant === "palette" && "text-theme-500 relative size-8 cursor-pointer self-center justify-self-center outline-none transition-transform hover:scale-110 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        variant === "segmented" && "relative inline-flex min-w-0 cursor-pointer items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-all outline-none hover:scale-105 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-checked:bg-theme-500 data-checked:text-white data-checked:shadow-md",
        className,
      )}
      {...props}
    >
      {variant === "default"
        ? (
            <RadioPrimitive.Indicator
              data-slot="radio-group-indicator"
              className="flex size-4 items-center justify-center"
            >
              <span className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-foreground" />
            </RadioPrimitive.Indicator>
          )
        : children}
    </RadioPrimitive.Root>
  )
}

export { RadioGroup, RadioGroupItem }
export type { RadioGroupVariant }
