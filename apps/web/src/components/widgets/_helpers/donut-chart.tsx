import { cn } from "@/lib/utils"

interface DonutChartProps {
  progress: number
  circleWidth?: number
  progressWidth?: number
  size?: number
  className?: string
  trackClassName?: string
  progressClassName?: string
  children?: React.ReactNode
}

export default function DonutChart({
  progress,
  circleWidth = 10,
  progressWidth = 10,
  size = 100,
  className,
  trackClassName,
  progressClassName,
  children,
}: DonutChartProps) {
  const radius = (size - circleWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className={cn("relative", className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={circleWidth}
          className={cn("opacity-20", trackClassName)}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={progressWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn("transition-all duration-300", progressClassName)}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  )
}
