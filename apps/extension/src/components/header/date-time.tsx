import { useI18n } from "@/hooks/use-i18n"
import { useMinuteDate } from "@/hooks/useRelativeTime"
import { cn } from "@/lib/utils"

export function DateTime({ className }: { className?: string }) {
  const { locale } = useI18n()
  const date = useMinuteDate()

  return (
    <div className={cn("island-pill px-4 flex items-center gap-3 select-none", className)}>
      <span className="text-lg font-bold tabular-nums text-accent-foreground/90 tracking-tight">
        {date.toLocaleTimeString(locale, {
          hour: "2-digit",
          hourCycle: "h23",
          minute: "2-digit",
        })}
      </span>
      <div className="flex-col-center text-[10px] font-semibold leading-tight text-accent-foreground/50 border-l border-accent-foreground/10 pl-3">
        <span>{date.toLocaleDateString(locale, { weekday: "short" })}</span>
        <span>{date.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" })}</span>
      </div>
    </div>
  )
}
