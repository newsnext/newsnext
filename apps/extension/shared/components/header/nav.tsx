import { useNavigate, useParams } from "@tanstack/react-router"
import { cn } from "@/lib/utils"
import { SegmentedControl } from "../common/segmented-control"

const TABS = [
  { label: "Featured", value: "featured" },
  { label: "Forks", value: "forks" },
  { label: "Stars", value: "stars" },
] as const

interface Props {
  className?: string
}

function Nav({ className }: Props) {
  const navigate = useNavigate()
  const { boardId } = useParams({ strict: false }) as { boardId?: string }

  return (
    <SegmentedControl
      className={cn("island-pill py-0", className)}
      items={TABS}
      value={boardId!}
      onValueChange={value => navigate({ to: "/boards/$boardId", params: { boardId: value } })}
      layoutId="active-tab"
    />
  )
}

export default Nav
