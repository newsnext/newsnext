import { format } from "date-fns"
import { enUS } from "date-fns/locale"
import { useAtomValue } from "jotai"
import { minuteDateAtom } from "@/hooks/useRelativeTime"
import { cn } from "@/lib/utils"

function formatTimeWithHighlight(time: string) {
  return Array.from(time.matchAll(/1|[^1]+/g), match => (
    <span key={match.index} className={match[0] === "1" ? "text-theme-500" : ""}>
      {match[0]}
    </span>
  ))
}

export function DateTime({ className }: { className?: string }) {
  const date = useAtomValue(minuteDateAtom)

  return (
    <div className={cn("island-pill px-4 flex items-center gap-3 select-none", className)}>
      <span className="text-lg font-bold tabular-nums text-accent-foreground/90 tracking-tight">
        {formatTimeWithHighlight(format(date, "HH:mm"))}
      </span>
      <div className="flex-col-center text-[10px] font-semibold leading-tight text-accent-foreground/50 border-l border-accent-foreground/10 pl-3">
        <span>{format(date, "EEE", { locale: enUS })}</span>
        <span>{format(date, "MM/dd")}</span>
      </div>
    </div>
  )
}
