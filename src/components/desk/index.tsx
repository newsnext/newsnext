import { useEffect, useState } from "react"
import { CardBoard } from "@/components/card-board"
import { Dashboard } from "@/components/dashboard"

export function Desk() {
  const [isScattered, setIsScattered] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault()
        setIsScattered(prev => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <>
      {/* Dashboard Layer (Fixed Background) */}
      <div className={`fixed inset-0 z-0 ${isScattered ? "pointer-events-auto" : "pointer-events-none"}`}>
        <Dashboard isVisible={isScattered} onClose={() => setIsScattered(false)} />
      </div>

      {/* CardBoard Layer (Scrollable Content) */}
      <div className={`relative z-10 h-full transition-all duration-300 ${isScattered ? "pointer-events-none" : ""}`}>
        <CardBoard isScattered={isScattered} />
      </div>
    </>
  )
}
