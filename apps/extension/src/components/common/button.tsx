import { ButtonPrimitive } from "@newsnext/ui/components/button"
import { cn } from "@/lib/utils"

export function IconButton({ children, className, ...props }: React.ComponentProps<typeof ButtonPrimitive>) {
  return (
    <ButtonPrimitive className={cn("opacity-50 hover:opacity-85 text-lg", className)} {...props}>
      {children}
    </ButtonPrimitive>
  )
}
