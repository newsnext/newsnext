import { useNavigate, useParams } from "@tanstack/react-router"
import { SegmentedControl } from "../common/segmented-control"

const TABS = [
  { label: "Featured", value: "featured" },
  { label: "Custom", value: "copies" },
  { label: "Stars", value: "stars" },
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
