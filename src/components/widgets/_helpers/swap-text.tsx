import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface SwapTextProps {
  initialText: string
  finalText: string
  textClassName?: string
  className?: string
}

export default function SwapText({
  initialText,
  finalText,
  textClassName,
  className,
}: SwapTextProps) {
  const [text, setText] = useState(initialText)

  useEffect(() => {
    const timer = setTimeout(() => {
      setText(finalText)
    }, 1000)
    return () => clearTimeout(timer)
  }, [finalText])

  return (
    <span className={cn("transition-all duration-300", textClassName, className)}>
      {text}
    </span>
  )
}
