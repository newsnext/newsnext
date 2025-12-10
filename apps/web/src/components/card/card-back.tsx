import { cn } from "@/lib/utils"
import { useCard } from "./card-context"

const TYPE_LABELS = {
  hottest: "Hot",
  realtime: "Realtime",
  normal: "Timeline",
} as const

export function CardBack() {
  const {
    id,
    source,
    items,
    isStarred,
    onCardClick,
  } = useCard()

  const { name, desc, home, type, interval, color } = source
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl p-4 h-full",
        `bg-${color}-400/40`,
      )}
      onClick={onCardClick}
    >
      <div className="flex justify-between mb-3 items-center mx-1">
        <div className="flex gap-2.5 items-center ml-1">
          <div
            className="size-8 rounded-full bg-cover"
            style={{
              backgroundImage: `url(/icons/${id}.png)`,
            }}
          />
          <div className="flex flex-col">
            <span className="text-xl font-bold">
              {name}
            </span>
            <span className="text-xs opacity-70">
              Card Back
            </span>
          </div>
        </div>
      </div>

      <div className={cn(
        "flex-1 px-4 py-6 min-h-0 rounded-2xl bg-background/70 overflow-y-auto",
        `sprinkle-${color}-400`,
      )}
      >
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Source Information</h3>
            <div className="space-y-2 text-sm">
              <p>
                <span className="opacity-70">Name: </span>
                {name}
              </p>
              {desc && (
                <p>
                  <span className="opacity-70">Description: </span>
                  {desc}
                </p>
              )}
              <p>
                <span className="opacity-70">Type: </span>
                {TYPE_LABELS[type || "normal"]}
              </p>
              <p>
                <span className="opacity-70">Update Interval: </span>
                {interval}
                {" "}
                minutes
              </p>
              {home && (
                <p>
                  <span className="opacity-70">Homepage: </span>
                  <a
                    href={home}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-500 hover:underline ml-1"
                  >
                    {home}
                  </a>
                </p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Statistics</h3>
            <div className="space-y-2 text-sm">
              <p>
                <span className="opacity-70">Items Count: </span>
                {items.length}
              </p>
              <p>
                <span className="opacity-70">Starred: </span>
                {isStarred ? "Yes" : "No"}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-current/20">
            <p className="text-xs opacity-50 text-center">
              Click blank area to flip back
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
