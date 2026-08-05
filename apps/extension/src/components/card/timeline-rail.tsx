const RAIL_PATH = "M6 0 Q0 25 6 50 Q12 75 6 100"
const LABEL_RAIL_PATH = "M16 0 Q3 0 2 20 Q2 35 6 50 Q12 75 6 100"
const RAIL_COLOR = "var(--color-theme-300)"

interface TimelineRailProps {
  gradientId: string
  index: number
  showLabel: boolean
}

export function TimelineRail({
  gradientId,
  index,
  showLabel,
}: TimelineRailProps): React.JSX.Element {
  const id = `${gradientId}-${index}`

  return (
    <div className="-ml-0.5 pointer-events-none absolute inset-y-0 w-4" aria-hidden>
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 14 100"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient
            id={id}
            x1="0"
            y1="0"
            x2="0"
            y2="100"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={RAIL_COLOR} stopOpacity={0.05} />
            <stop offset="55%" stopColor={RAIL_COLOR} stopOpacity={0.35} />
            <stop offset="100%" stopColor={RAIL_COLOR} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <path
          d={showLabel ? LABEL_RAIL_PATH : RAIL_PATH}
          className="fill-none"
          stroke={`url(#${id})`}
          vectorEffect="non-scaling-stroke"
          strokeWidth={1.25}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
