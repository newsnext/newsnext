import type { LocalePreference } from "@/lib/i18n"
import type { SettingsTabId } from "@/lib/settings"
import { RadioGroup, RadioGroupItem } from "@newsnext/ui/components/radio-group"
import { TabsContent } from "@newsnext/ui/components/tabs"
import { useNavigate } from "@tanstack/react-router"
import { useAtom, useAtomValue } from "jotai"
import { useEffect } from "react"
import { ConfigSection } from "@/components/common/config-section"
import { useI18n } from "@/hooks/use-i18n"
import { revealLiveCard } from "@/lib/board"
import { boardsAtom } from "@/store/board"
import {
  defaultBoardIdAtom,
  settingsTabAtom,
  themeModeAtom,
} from "@/store/settings"
import { ThemeModeSelector } from "../theme-mode-selector"
import { DataTransferSettings } from "./data-transfer"
import { SettingsModalShell } from "./modal-shell"
import { NativeIntegrationSettings } from "./native-integration"
import { PermissionsSettings } from "./permissions"
import { RegistrySettings } from "./registry-urls"
import { ShortcutsSettings } from "./shortcuts"
import { SourceIconSettings } from "./source-icon"

const LAST_USED_BOARD_VALUE = "__last_used__"

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
      onTabChange={setActiveTab}
    >
      <TabsContent value="general"><GeneralSettings /></TabsContent>
      <TabsContent value="registry"><RegistrySettings /></TabsContent>
      <TabsContent value="cli"><NativeIntegrationSettings /></TabsContent>
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

function GeneralSettings() {
  const { preference, setPreference, t } = useI18n()
  const [themeMode, setThemeMode] = useAtom(themeModeAtom)
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
      <ConfigSection title={t("themeMode")}>
        <ThemeModeSelector value={themeMode} onValueChange={setThemeMode} />
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
