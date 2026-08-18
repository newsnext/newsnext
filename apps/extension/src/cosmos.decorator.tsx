import type { Color } from "@newsnext/shared/types"
import type { PropsWithChildren, ReactNode } from "react"
import { DynamicIsland } from "@newsnext/ui/components/dynamic-island"
import { Logo } from "@newsnext/ui/components/logo"
import { RadioGroup, RadioGroupItem } from "@newsnext/ui/components/radio-group"
import { Switch } from "@newsnext/ui/components/switch"
import { ThemeSelector } from "@newsnext/ui/components/theme-selector"
import { WordmarkLogo } from "@newsnext/ui/components/wordmark-logo"
import { QueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { AppProvider } from "@/components/app-provider"
import { CornerRenderingProvider, useCornerRendering } from "@/cosmos/corner-rendering-context"
import { isThemeColor } from "@/lib/settings"
import {
  handleThemeModeSwitch,
  handleThemeSwitch,
  THEME_COLOR_KEY,
} from "@/lib/utils/swith-theme"

const queryClient = new QueryClient()

function getInitialThemeColor(): Color {
  const storedColor = localStorage.getItem(THEME_COLOR_KEY)
  return storedColor && isThemeColor(storedColor) ? storedColor : "red"
}

function CosmosAppearanceControls(): React.JSX.Element {
  const [color, setColor] = useState<Color>(getInitialThemeColor)
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"))
  const { rendering, setRendering } = useCornerRendering()

  function changeColor(nextColor: Color): void {
    setColor(nextColor)
    handleThemeSwitch(nextColor)
  }

  function changeMode(nextIsDark: boolean): void {
    setIsDark(nextIsDark)
    handleThemeModeSwitch(nextIsDark ? "dark" : "light")
  }

  return (
    <>
      <DynamicIsland
        top={12}
        cornerRendering={rendering}
        smallClassName="flex items-center justify-center gap-2 px-4"
        largeClassName="p-3"
        smallHeight={40}
        smallWidth={150}
        largeWidth={356}
        largeHeight={192}
      >
        {isSmall => isSmall
          ? (
              <div className="flex size-full items-center justify-center gap-2">
                <Logo className="size-5 text-primary" />
                <WordmarkLogo className="h-auto w-[4.6em] text-xl" />
              </div>
            )
          : (
              <section
                aria-label="Cosmos appearance controls"
                className="grid size-full content-center gap-4 text-foreground"
                onClick={event => event.stopPropagation()}
              >
                <div className="h-28">
                  <ThemeSelector
                    value={color}
                    onValueChange={changeColor}
                    layoutId="cosmos-global-theme-indicator"
                  />
                </div>
                <div className="flex items-center justify-center gap-2">
                  <label className="flex h-8 items-center gap-2 rounded-full bg-background/60 px-3 text-xs font-medium whitespace-nowrap">
                    Dark mode
                    <Switch
                      checked={isDark}
                      onCheckedChange={changeMode}
                      aria-label="Toggle dark mode"
                      size="sm"
                    />
                  </label>
                  <RadioGroup
                    aria-label="Corner rendering"
                    className="bg-background/60 p-0.5"
                    value={rendering}
                    onValueChange={setRendering}
                    variant="segmented"
                  >
                    <RadioGroupItem className="h-7 px-2 text-xs" value="corner-shape">Native</RadioGroupItem>
                    <RadioGroupItem className="h-7 px-2 text-xs" value="shape">Shape</RadioGroupItem>
                    <RadioGroupItem className="h-7 px-2 text-xs" value="round">Round</RadioGroupItem>
                  </RadioGroup>
                </div>
              </section>
            )}
      </DynamicIsland>
    </>
  )
}

export default function CosmosDecorator({ children }: PropsWithChildren): ReactNode {
  return (
    <CornerRenderingProvider>
      <AppProvider queryClient={queryClient}>
        <CosmosAppearanceControls />
        <div className="min-h-full pt-16">
          {children}
        </div>
      </AppProvider>
    </CornerRenderingProvider>
  )
}
