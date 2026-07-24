import { COLORS } from "@newsnext/shared/constants"
import { m } from "motion/react"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { handleThemeSwitch, THEME_COLOR_KEY } from "@/lib/utils/swith-theme"
import { Logo } from "../icons/logo"

export function ThemeSelector() {
  const [currentTheme, setCurrentTheme] = useState(
    () => localStorage.getItem(THEME_COLOR_KEY) ?? "",
  )

  useEffect(() => {
    if (currentTheme) {
      handleThemeSwitch(currentTheme)
    }
  }, [currentTheme])

  return (
    <div className="h-full grid grid-cols-6 w-full">
      {COLORS.map(color => (
        <button
          key={color}
          type="button"
          className={cn(
            "text-theme-500 size-8 hover:scale-110 cursor-pointer p-0 relative self-center justify-self-center",
            color,
          )}
          onClick={(e) => {
            e.stopPropagation()
            handleThemeSwitch(color)
            setCurrentTheme(color)
          }}
          title={color}
        >
          {currentTheme === color && (
            <m.div
              layoutId="theme-indicator"
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 size-1 rounded-full bg-theme-500"
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
  )
}
