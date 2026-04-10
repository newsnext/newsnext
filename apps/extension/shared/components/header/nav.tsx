import { useNavigate, useParams } from "@tanstack/react-router"
import { SegmentedControl } from "../common/segmented-control"

const TABS = [
  { label: "Stars", value: "stars" },
  { label: "Hottest", value: "hottest" },
  { label: "Timeline", value: "timeline" },
  { label: "Realtime", value: "realtime" },
] as const

function Nav() {
  const navigate = useNavigate()
  const { boardId } = useParams({ strict: false }) as { boardId?: string }

  return (
    <SegmentedControl
      className="island-pill py-0"
      items={TABS}
      value={boardId!}
      onValueChange={value => navigate({ to: "/boards/$boardId", params: { boardId: value } })}
      layoutId="active-tab"
    />
  )
}

export default Nav
