import { cn } from "@/lib/utils"

const TABS = ["All", "Tech", "Social", "News"] as const
function Nav() {
  return (
    <div className="island-pill flex gap-2 items-center px-2 h-10 pointer-events-auto">
      {TABS.map((tab, index) => (
        <button
          key={tab}
          className={cn(
            `px-2 py-0.5 rounded-full text-sm font-medium transition-all whitespace-nowrap`,
            index === 0
              ? "bg-theme-400 text-white shadow-md"
              : "text-white/70 hover:text-white hover:bg-white/10",
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}

export default Nav