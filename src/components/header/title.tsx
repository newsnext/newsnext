import type { RefObject } from "react"
import { motion, useScroll, useTransform } from "motion/react"
import { useCallback, useEffect, useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { COLORS } from "@/typings/constants"
import { Logo } from "../icons/logo"

interface TitleProps {
  scrollContainerRef?: RefObject<HTMLElement | null>
}

function ThemeSwitcher({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState("red")

  useEffect(() => {
    const root = document.documentElement
    const found = COLORS.find(c => root.classList.contains(c))
    if (found) setCurrentTheme(found)
  }, [])

  const handleThemeChange = (color: string) => {
    const root = document.documentElement
    COLORS.forEach(c => root.classList.remove(c))
    root.classList.add(color)
    setCurrentTheme(color)
    localStorage.setItem("theme", color)
  }

  return (
    <Popover>
      <PopoverTrigger
        onClick={e => e.stopPropagation()}
        className="cursor-pointer outline-none transition-transform active:scale-95 flex items-center justify-center"
      >
        {children}
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="center"
        className="p-3 mt-3 sprinkle-theme-400"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-wrap gap-3 justify-center">
          {COLORS.map(color => (
            <button
              key={color}
              className={cn(
                "text-theme-400 size-8 hover:scale-110 transition-transform cursor-pointer flex-center p-0 relative",
                color,
              )}
              onClick={() => handleThemeChange(color)}
              title={color}
            >
              {currentTheme === color && (
                <motion.div
                  layoutId="theme-indicator"
                  className="absolute -bottom-1 size-1 rounded-full bg-theme-500"
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                  }}
                />
              )}
              <Logo className="size-full p-0.5" />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function Title({ scrollContainerRef }: TitleProps) {
  const { scrollYProgress, scrollY } = useScroll({
    container: scrollContainerRef,
  })

  // Only show opacity when scroll height > 150% of screen height
  const opacity = useTransform(scrollY, (value) => {
    const screenHeight = window.innerHeight
    const threshold = screenHeight * 0.1
    if (value < threshold) return 0
    // Fade in over the next 10% of screen height
    const fadeRange = screenHeight * 0.1
    return Math.min((value - threshold) / fadeRange, 1)
  })

  const handleScrollToTop = useCallback(() => {
    const container = scrollContainerRef?.current
    if (container) {
      container.scrollTo({ top: 0, behavior: "smooth" })
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }, [scrollContainerRef])

  return (
    <div
      onClick={handleScrollToTop}
      className="island-pill relative flex gap-2 items-center px-4 hover:bg-black/30 shrink-0 pointer-events-auto cursor-pointer"
    >
      <svg className="absolute inset-0 size-full pointer-events-none">
        <motion.rect
          x="1"
          y="1"
          style={{
            width: "calc(100% - 2px)",
            height: "calc(100% - 2px)",
            pathLength: scrollYProgress,
            opacity,
          }}
          rx="19"
          ry="19"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-theme-400"
        />
      </svg>
      <ThemeSwitcher>
        <Logo className="text-theme-400 size-5" />
      </ThemeSwitcher>
      <span className="text-xl font-brand font-bold whitespace-nowrap">
        News
        <span className="text-theme-400">N</span>
        ext
      </span>
    </div>
  )
}
