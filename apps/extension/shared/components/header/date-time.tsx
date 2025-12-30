import { format } from "date-fns"
import { enUS } from "date-fns/locale"
import { useAtomValue } from "jotai"
import { minuteDateAtom } from "@/hooks/useRelativeTime"

function formatTimeWithHighlight(time: string) {
  return time.split("").map((char, index) => (
    <span key={index} className={char === "1" ? "text-theme-400" : ""}>
      {char}
    </span>
  ))
}

export function DateTime() {
  const date = useAtomValue(minuteDateAtom)

  return (
    <div className="island-pill px-4 flex items-center gap-3 select-none">
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
