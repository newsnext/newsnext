import { motion } from "motion/react"
import { useState } from "react"
import { cn } from "@/lib/utils"

const TABS = ["All", "Tech", "Social", "News"] as const

function Nav() {
  const [activeTab, setActiveTab] = useState<number>(0)

  return (
    <div className="island-pill flex gap-2 items-center px-2 pointer-events-auto">
      {TABS.map((tab, index) => (
        <button
          key={tab}
          onClick={() => setActiveTab(index)}
          className={cn(
            "relative px-2 py-0.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
            activeTab === index
              ? "text-white"
              : "text-white/70 hover:text-white",
          )}
        >
          {activeTab === index && (
            <motion.div
              layoutId="active-tab"
              className="absolute inset-0 bg-theme-400 rounded-full shadow-md"
              transition={{
                type: "spring",
                stiffness: 380,
                damping: 30,
              }}
            />
          )}
          <span className="relative z-10">{tab}</span>
        </button>
      ))}
    </div>
  )
}

export default Nav