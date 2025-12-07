import { useEffect, useState } from "react"
import { CardBoard } from "@/components/card-board"
import { Dashboard } from "@/components/dashboard"

export function Desk() {
  const [isSearchMode, setIsSearchMode] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault()
        setIsSearchMode(prev => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <>
      {/* Dashboard Layer (Fixed Background) */}
      <div className={`fixed inset-0 z-0 ${isSearchMode ? "pointer-events-auto" : "pointer-events-none"}`}>
        <Dashboard isVisible={isSearchMode} onClose={() => setIsSearchMode(false)} />
      </div>

      {/* CardBoard Layer (Scrollable Content) */}
      <div className={`relative z-10 transition-all duration-300 ${isSearchMode ? "pointer-events-none" : ""}`}>
        <CardBoard isSearchMode={isSearchMode} />
      </div>
    </>
  )
}
