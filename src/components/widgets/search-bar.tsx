import { PhMagnifyingGlass } from "@/components/icons/ph"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useState, useRef, useEffect } from "react"

export function SearchBar({
  className,
  onSearch,
  autoFocus = false
}: {
  className?: string
  onSearch?: () => void
  autoFocus?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")

  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [autoFocus])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && query.trim()) {
      window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, "_blank")
      onSearch?.()
    }
  }

  return (
    <div className={cn("relative group w-full", className)}>
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
        <PhMagnifyingGlass className="size-6" />
      </div>
      <Input
        ref={inputRef}
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search Google..."
        className="h-16 pl-14 text-xl rounded-2xl shadow-lg border-2 border-transparent focus-visible:border-primary/50 focus-visible:ring-0 bg-background/90 hover:bg-background transition-all"
      />
    </div>
  )
}
