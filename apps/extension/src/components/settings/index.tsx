import type { LocalePreference, StaticMessageKey } from "@/lib/i18n"
import type { LiveCardHeight, SettingsTabId } from "@/lib/settings"
import { Label } from "@newsnext/ui/components/label"
import { RadioGroup, RadioGroupItem } from "@newsnext/ui/components/radio-group"
import { TabsContent } from "@newsnext/ui/components/tabs"
import { useNavigate } from "@tanstack/react-router"
import { useAtom, useAtomValue } from "jotai"
import { useEffect } from "react"
import { ConfigSection } from "@/components/common/config-section"
import { useI18n } from "@/hooks/use-i18n"
import { revealLiveCard } from "@/lib/board"
import { cn } from "@/lib/utils"
import { boardsAtom } from "@/store/board"
import {
  defaultBoardIdAtom,
  liveCardHeightAtom,
  settingsTabAtom,
  themeModeAtom,
} from "@/store/settings"
import { ThemeModeSelector } from "../theme-mode-selector"
import { AppIntegrationSettings } from "./app-integration"
import { DataTransferSettings } from "./data-transfer"
import { SettingsModalShell } from "./modal-shell"
import { PermissionsSettings } from "./permissions"
import { RegistrySettings } from "./registry-urls"
import { ShortcutsSettings } from "./shortcuts"
import { SourceIconSettings } from "./source-icon"

const LAST_USED_BOARD_VALUE = "__last_used__"

interface LiveCardHeightOption {
  labelKey: StaticMessageKey
  previewClassName: string
  value: LiveCardHeight
}

const LIVE_CARD_HEIGHT_OPTIONS: LiveCardHeightOption[] = [
  {
    labelKey: "compact",
    previewClassName: "h-12",
    value: "compact",
  },
  {
    labelKey: "balanced",
    previewClassName: "h-12.5",
    value: "balanced",
  },
  {
    labelKey: "tall",
    previewClassName: "h-14.5",
    value: "tall",
  },
]

export type { SettingsTabId } from "@/lib/settings"

export function SettingsModal({
  initialTab,
  open,
  onOpenChange,
}: {
  initialTab?: SettingsTabId
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const resetKey = `${open}:${initialTab ?? "saved"}`
  return (
    <SettingsModalContent
      key={resetKey}
      initialTab={initialTab}
      open={open}
      onOpenChange={onOpenChange}
    />
  )
}

function SettingsModalContent({
  initialTab,
  open,
  onOpenChange,
}: {
  initialTab?: SettingsTabId
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [activeTab, setActiveTab] = useAtom(settingsTabAtom)
  const navigate = useNavigate()

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab)
    }
  }, [initialTab, setActiveTab])

  const handleTabChange = (tabId: SettingsTabId) => {
    setActiveTab(tabId)
  }

  async function handleOpenLiveCard(id: string, boardId: string): Promise<void> {
    onOpenChange(false)
    await navigate({ to: "/board/$boardId", params: { boardId } })
    revealLiveCard(id)
  }

  return (
    <SettingsModalShell
      activeTab={activeTab}
      open={open}
      onOpenChange={onOpenChange}
      onTabChange={handleTabChange}
    >
      <TabsContent value="appearance"><AppearanceSettings /></TabsContent>
      <TabsContent value="general"><GeneralSettings /></TabsContent>
      <TabsContent value="registry"><RegistrySettings /></TabsContent>
      <TabsContent value="cli"><AppIntegrationSettings /></TabsContent>
      <TabsContent value="shortcuts"><ShortcutsSettings /></TabsContent>
      <TabsContent value="permissions">
        <PermissionsSettings onOpenLiveCard={handleOpenLiveCard} />
      </TabsContent>
      <TabsContent value="data">
        <DataTransferSettings onCleared={() => onOpenChange(false)} />
      </TabsContent>
    </SettingsModalShell>
  )
}

function AppearanceSettings() {
  const { t } = useI18n()
  const [themeMode, setThemeMode] = useAtom(themeModeAtom)

  return (
    <div className="space-y-6">
      <ConfigSection
        title={t("themeMode")}
      >
        <ThemeModeSelector
          value={themeMode}
          onValueChange={setThemeMode}
        />
      </ConfigSection>
      <LiveCardHeightSettings />
    </div>
  )
}

function LiveCardHeightSettings() {
  const { t } = useI18n()
  const [liveCardHeight, setLiveCardHeight] = useAtom(liveCardHeightAtom)

  return (
    <ConfigSection
      title={t("liveCardHeight")}
      description={t("liveCardHeightDescription")}
    >
      <RadioGroup
        className="grid w-full grid-cols-3 gap-2"
        value={liveCardHeight}
        onValueChange={setLiveCardHeight}
      >
        {LIVE_CARD_HEIGHT_OPTIONS.map((option) => {
          const isSelected = option.value === liveCardHeight
          const label = t(option.labelKey)
          return (
            <Label key={option.value} className="cursor-pointer">
              <RadioGroupItem
                aria-label={label}
                value={option.value}
                className="peer sr-only"
              />
              <span className={cn(
                "flex min-h-28 flex-1 flex-col items-center justify-center gap-2 rounded-2xl px-2 py-2 text-center text-muted-foreground transition-colors outline-none hover:text-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-theme-400",
                isSelected && "text-foreground",
              )}
              >
                <span className="flex h-16 items-center justify-center" aria-hidden>
                  <span className={cn(
                    "flex w-10 flex-col rounded-xl border bg-background/35 p-1.5 transition-all",
                    option.previewClassName,
                    isSelected
                      ? "border-primary text-primary ring-2 ring-primary/15"
                      : "border-foreground/20",
                  )}
                  >
                    <span className="h-1 w-3/5 rounded-full bg-current/55" />
                    <span className="mt-1 min-h-0 flex-1 rounded-sm bg-current/15" />
                  </span>
                </span>
                <span className={cn("font-semibold leading-tight", isSelected && "text-primary")}>
                  {label}
                </span>
              </span>
            </Label>
          )
        })}
      </RadioGroup>
    </ConfigSection>
  )
}

function GeneralSettings() {
  const { preference, setPreference, t } = useI18n()
  const boards = useAtomValue(boardsAtom)
  const [defaultBoardId, setDefaultBoardId] = useAtom(defaultBoardIdAtom)
  const selectedValue = defaultBoardId ?? LAST_USED_BOARD_VALUE

  return (
    <div className="space-y-6">
      <ConfigSection
        title={t("language")}
        description={t("chooseLanguage")}
      >
        <LanguageSelector value={preference} onValueChange={setPreference} />
      </ConfigSection>
      <ConfigSection
        title={t("boardDefault")}
        description={t("boardDefaultDescription")}
      >
        <RadioGroup
          aria-label={t("boardDefault")}
          variant="segmented"
          className="max-w-full min-w-0 overflow-hidden"
          value={selectedValue}
          onValueChange={(value: string) => {
            setDefaultBoardId(value === LAST_USED_BOARD_VALUE ? null : value)
          }}
        >
          <div className="flex min-w-0 items-center gap-1 overflow-x-auto scrollbar-hidden">
            {boards.map(board => (
              <RadioGroupItem key={board.id} value={board.id} className="shrink-0">
                {board.name}
              </RadioGroupItem>
            ))}
          </div>
          <RadioGroupItem value={LAST_USED_BOARD_VALUE} className="shrink-0">
            {t("boardLastOpened")}
          </RadioGroupItem>
        </RadioGroup>
      </ConfigSection>
      <SourceIconSettings />
    </div>
  )
}

function LanguageSelector({ value, onValueChange }: {
  value: LocalePreference
  onValueChange: (value: LocalePreference) => void
}): React.JSX.Element {
  const { t } = useI18n()
  return (
    <RadioGroup
      aria-label={t("language")}
      variant="segmented"
      className="max-w-full overflow-x-auto scrollbar-hidden"
      value={value}
      onValueChange={onValueChange}
    >
      <RadioGroupItem value="system" className="shrink-0">{t("systemLanguage")}</RadioGroupItem>
      <RadioGroupItem value="zh-CN" className="shrink-0">简体中文</RadioGroupItem>
      <RadioGroupItem value="zh-TW" className="shrink-0">繁體中文</RadioGroupItem>
      <RadioGroupItem value="en" className="shrink-0">English</RadioGroupItem>
    </RadioGroup>
  )
}
