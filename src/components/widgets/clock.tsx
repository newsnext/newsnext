import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export function Clock({ className }: { className?: string }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const hours = time.getHours().toString().padStart(2, "0")
  const minutes = time.getMinutes().toString().padStart(2, "0")

  return (
    <div className={cn("flex flex-col items-center justify-center p-6 bg-background/50 backdrop-blur rounded-3xl border border-white/10 shadow-lg", className)}>
      <div className="text-6xl font-bold tracking-tighter text-foreground/90 tabular-nums">
        {hours}
        :
        {minutes}
      </div>
      <div className="mt-2 text-lg font-medium text-muted-foreground">
        {time.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
      </div>
    </div>
  )
}
