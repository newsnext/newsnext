import { cn } from "@/lib/utils"

interface BarChartItem {
  progress: number
  label: string
  className?: string
  containerClassName?: string
}

interface BarChartProps {
  items: BarChartItem[]
  height?: number
  className?: string
}

export default function BarChart({ items, height = 40, className }: BarChartProps) {
  const maxProgress = Math.max(...items.map(item => item.progress), 100)

  return (
    <div className={cn("flex items-end gap-1", className)} style={{ height: `${height}px` }}>
      {items.map((item, index) => (
        <div
          key={index}
          className={cn("flex-1 flex flex-col items-center", item.containerClassName)}
        >
          <div
            className={cn("w-full rounded-t transition-all duration-300", item.className)}
            style={{
              height: `${(item.progress / maxProgress) * height}px`,
            }}
          />
          <span className="text-xs mt-1 text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  )
}
