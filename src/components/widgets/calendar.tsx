import { useState } from "react"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

export function Calendar({ className }: { className?: string }) {
  const [date, setDate] = useState<Date | undefined>(new Date())

  return (
    <div className={cn("p-4 bg-background/50 backdrop-blur rounded-3xl border border-white/10 shadow-lg", className)}>
      <CalendarComponent
        mode="single"
        selected={date}
        onSelect={setDate}
        className="rounded-md border-none"
      />
    </div>
  )
}
