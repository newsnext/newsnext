import type { ChatToolStep } from "@/lib/chat-messages"
import { useState } from "react"
import {
  PhCaretRight,
  PhCheckCircle,
  PhCircleDashed,
  PhDatabase,
  PhXCircle,
} from "@/components/icons/ph"

interface ToolTimelineProps {
  turnActive: boolean
  tools: ChatToolStep[]
}

export function ToolTimeline({ turnActive, tools }: ToolTimelineProps): React.JSX.Element {
  const [userOpen, setUserOpen] = useState(false)
  const open = turnActive || userOpen

  const failedCount = tools.filter(tool => tool.status === "error" || tool.status === "stopped").length
  const restingLabel = failedCount > 0
    ? `${failedCount} ${failedCount === 1 ? "tool" : "tools"} did not finish`
    : `Used ${tools.length} ${tools.length === 1 ? "tool" : "tools"}`

  return (
    <div className="mb-3">
      <button
        type="button"
        className="flex items-center gap-1.5 rounded-md py-1 text-[12.5px] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-primary/35"
        aria-expanded={open}
        onClick={() => {
          if (!turnActive) setUserOpen(value => !value)
        }}
      >
        <PhCaretRight className={`size-3.5 shrink-0 opacity-60 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-90" : ""}`} />
        <span className={turnActive ? "animate-pulse text-primary motion-reduce:animate-none" : undefined}>
          {turnActive ? "Working with source history" : restingLabel}
        </span>
      </button>
      <div className={`grid transition-[grid-template-rows,opacity] duration-200 motion-reduce:transition-none ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <ol className="pt-2 pl-1">
            {tools.map((tool, index) => (
              <ToolTimelineStep
                key={tool.id}
                last={index === tools.length - 1}
                tool={tool}
              />
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}

interface ToolTimelineStepProps {
  last: boolean
  tool: ChatToolStep
}

function ToolTimelineStep({ last, tool }: ToolTimelineStepProps): React.JSX.Element {
  return (
    <li className="grid grid-cols-[1rem_minmax(0,1fr)] gap-x-2.5 text-[12px] text-muted-foreground">
      <div className="relative flex justify-center">
        {!last && <span aria-hidden className="absolute top-4 bottom-0 w-px bg-foreground/10" />}
        <span className="relative z-1 flex size-4 items-center justify-center rounded-full bg-background/65">
          <ToolStatusIcon status={tool.status} />
        </span>
      </div>
      <div className={last ? "pb-0.5" : "pb-3"}>
        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 leading-4">
          <span className={tool.status === "running" ? "text-foreground" : undefined}>{tool.label}</span>
          <span className="max-w-full truncate rounded-md bg-foreground/6 px-1.5 py-0.5 font-mono text-[10px] text-foreground/70">
            {tool.target}
          </span>
        </div>
        {tool.summary && <p className="mt-1 text-[10px] leading-4 text-muted-foreground/75">{tool.summary}</p>}
      </div>
    </li>
  )
}

function ToolStatusIcon({ status }: { status: ChatToolStep["status"] }): React.JSX.Element {
  if (status === "running") return <PhCircleDashed className="size-3.5 animate-spin text-primary" aria-label="Running" />
  if (status === "complete") return <PhCheckCircle className="size-3.5 text-primary" aria-label="Complete" />
  if (status === "error") return <PhXCircle className="size-3.5 text-destructive" aria-label="Failed" />
  return <PhDatabase className="size-3.5 text-muted-foreground/60" aria-label="Stopped" />
}
