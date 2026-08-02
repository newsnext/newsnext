import { Radio as RadioPrimitive } from "@base-ui/react/radio"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"

import {
  PillGroup,
  PillGroupIndicator,
  pillGroupItemClassName,
} from "@newsnext/ui/components/pill-group"
import { cn } from "@newsnext/ui/lib/utils"
import { createContext, use, useId } from "react"

type RadioGroupVariant = "default" | "segmented"

interface RadioGroupStyleContextValue {
  indicatorLayoutId: string
  variant: RadioGroupVariant
}

const RadioGroupStyleContext = createContext<RadioGroupStyleContextValue>({
  indicatorLayoutId: "",
  variant: "default",
})

function RadioGroup<Value>({
  className,
  variant = "default",
  children,
  ...props
}: RadioGroupPrimitive.Props<Value> & { variant?: RadioGroupVariant }): React.JSX.Element {
  const indicatorLayoutId = `segmented-radio-${useId()}`

  return (
    <RadioGroupStyleContext value={{ indicatorLayoutId, variant }}>
      <RadioGroupPrimitive
        data-slot="radio-group"
        data-variant={variant}
        className={cn(
          variant === "default" && "grid w-full gap-3",
          className,
        )}
        {...props}
        render={variant === "segmented" ? <PillGroup /> : props.render}
      >
        {children}
      </RadioGroupPrimitive>
    </RadioGroupStyleContext>
  )
}

function RadioGroupItem<Value>({
  className,
  children,
  ...props
}: RadioPrimitive.Root.Props<Value>): React.JSX.Element {
  const { indicatorLayoutId, variant } = use(RadioGroupStyleContext)

  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      data-variant={variant}
      className={cn(
        variant === "default" && "group/radio-group-item peer relative flex aspect-square size-4 shrink-0 rounded-full border border-input outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary",
        variant === "segmented" && pillGroupItemClassName(),
        className,
      )}
      {...props}
      render={variant === "segmented"
        ? (renderProps, state) => (
            <span {...renderProps}>
              {state.checked && (
                <PillGroupIndicator layoutId={indicatorLayoutId} />
              )}
              <span className="relative z-10">{children}</span>
            </span>
          )
        : props.render}
    >
      {variant === "default" && (
        <RadioPrimitive.Indicator
          data-slot="radio-group-indicator"
          className="flex size-4 items-center justify-center"
        >
          <span className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-foreground" />
        </RadioPrimitive.Indicator>
      )}
    </RadioPrimitive.Root>
  )
}

export { RadioGroup, RadioGroupItem }
export type { RadioGroupVariant }
