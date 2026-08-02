import { format } from "date-fns"
import { enUS } from "date-fns/locale"
import { useAtomValue } from "jotai"
import { minuteDateAtom } from "@/hooks/useRelativeTime"
import { cn } from "@/lib/utils"

export function DateTime({ className }: { className?: string }) {
  const date = useAtomValue(minuteDateAtom)

  return (
    <div className={cn("island-pill px-4 flex items-center gap-3 select-none", className)}>
      <span className="text-lg font-bold tabular-nums text-accent-foreground/90 tracking-tight">
        {format(date, "HH:mm")}
      </span>
      <div className="flex-col-center text-[10px] font-semibold leading-tight text-accent-foreground/50 border-l border-accent-foreground/10 pl-3">
        <span>{format(date, "EEE", { locale: enUS })}</span>
        <span>{format(date, "MM/dd")}</span>
      </div>
    </div>
  )
}
