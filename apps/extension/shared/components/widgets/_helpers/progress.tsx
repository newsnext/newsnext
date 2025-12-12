import { cn } from "@/lib/utils"

interface ProgressProps {
  progress: number
  className?: string
}

export default function Progress({ progress, className }: ProgressProps) {
  return (
    <div className={cn("h-2 w-full bg-gray-700 rounded-full overflow-hidden", className)}>
      <div
        className="h-full bg-pink-500 transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  )
}
