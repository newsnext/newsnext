import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

interface ToggleSwitchProps {
  defaultChecked?: boolean
  checked?: boolean
  onChange?: (checked: boolean) => void
  className?: string
}

export default function ToggleSwitch({
  defaultChecked,
  checked,
  onChange,
  className,
}: ToggleSwitchProps) {
  return (
    <Switch
      checked={checked}
      defaultChecked={defaultChecked}
      onCheckedChange={onChange}
      className={className}
    />
  )
}
