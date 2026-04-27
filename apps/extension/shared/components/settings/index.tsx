import type { AuthProviderId } from "@/lib/auth-client"
import type { ThemeMode, ThemeVersion } from "@/lib/utils/swith-theme"
import { Button } from "@newsnext/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@newsnext/ui/components/dialog"
import { Label } from "@newsnext/ui/components/label"
import { Spinner } from "@newsnext/ui/components/spinner"
import { cn } from "@newsnext/ui/lib/utils"
import { LogOut } from "lucide-react"
import { useEffect, useState } from "react"
import { authClient, signInWithProvider } from "@/lib/auth-client"
import {
  handleThemeModeSwitch,
  handleThemeVersionSwitch,
  THEME_MODE_KEY,
  THEME_VERSION_KEY,
} from "@/lib/utils/swith-theme"
import { SegmentedControl } from "../common/segmented-control"
import { ThemeSelector } from "../common/theme-selector"
import { PhGithubLogoDuotone, PhGoogleLogoDuotone } from "../icons/ph"

const SETTINGS_TAB_KEY = "newsnext-settings-tab"
const DEFAULT_BOARD_KEY = "newsnext-default-board"
export type SettingsTabId = "appearance" | "general" | "account"

export function SettingsModal({
  initialAccountError,
  initialTab,
  open,
  onOpenChange,
}: {
  initialAccountError?: string | null
  initialTab?: SettingsTabId
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>(() => {
    return readSettingsTab(initialTab)
  })

  useEffect(() => {
    if (open) {
      setActiveTab(readSettingsTab(initialTab))
    }
  }, [initialTab, open])

  const handleTabChange = (tabId: SettingsTabId) => {
    setActiveTab(tabId)
    localStorage.setItem(SETTINGS_TAB_KEY, tabId)
  }

  const tabs: Array<{ id: SettingsTabId, label: string }> = [
    { id: "appearance", label: "Appearance" },
    { id: "general", label: "General" },
    { id: "account", label: "Account" },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full h-[600px] p-0 gap-0 overflow-hidden flex sm:max-w-3xl">
        {/* Left Sidebar */}
        <div className="w-48 border-r bg-muted/30 p-2 flex flex-col gap-1 shrink-0">
          <div className="p-4 font-semibold text-sm text-muted-foreground">Settings</div>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "flex items-center w-full px-3 py-2 text-sm font-medium rounded-md transition-colors text-left",
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {/* Right Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <DialogHeader className="mb-6">
            <DialogTitle>{tabs.find(t => t.id === activeTab)?.label}</DialogTitle>
          </DialogHeader>
          {activeTab === "appearance" && <AppearanceSettings />}
          {activeTab === "general" && <GeneralSettings />}
          {activeTab === "account" && <AccountSettings initialError={initialAccountError} />}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function readSettingsTab(initialTab?: SettingsTabId): SettingsTabId {
  if (initialTab) {
    localStorage.setItem(SETTINGS_TAB_KEY, initialTab)
    return initialTab
  }

  const savedTab = localStorage.getItem(SETTINGS_TAB_KEY)
  return isSettingsTabId(savedTab) ? savedTab : "appearance"
}

function isSettingsTabId(value: string | null): value is SettingsTabId {
  return value === "appearance" || value === "general" || value === "account"
}

function AppearanceSettings() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(THEME_MODE_KEY) as ThemeMode | null
    return stored ?? "dark"
  })
  const [themeVersion, setThemeVersion] = useState<ThemeVersion>(() => {
    const stored = localStorage.getItem(THEME_VERSION_KEY) as ThemeVersion | null
    return stored === "v4" ? "v4" : "v3"
  })

  useEffect(() => {
    handleThemeModeSwitch(themeMode)
  }, [themeMode])

  useEffect(() => {
    handleThemeVersionSwitch(themeVersion)
  }, [themeVersion])

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Theme Color</h3>
        <div className="flex w-[300px] h-[160px]">
          <ThemeSelector />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Theme Mode</Label>
        <SegmentedControl<ThemeMode>
          items={[
            { value: "dark", label: "Dark" },
            { value: "light", label: "Light" },
            { value: "system", label: "System" },
          ]}
          value={themeMode}
          onValueChange={setThemeMode}
          layoutId="theme-mode-toggle"
        />
        <p className="text-sm text-muted-foreground">
          Toggles the html `dark` class or follows your OS setting.
        </p>
      </div>
      <div className="space-y-2">
        <Label>Color Version</Label>
        <SegmentedControl<ThemeVersion>
          items={[
            { value: "v3", label: "v3 (default)" },
            { value: "v4", label: "v4 (vivid)" },
          ]}
          value={themeVersion}
          onValueChange={setThemeVersion}
          layoutId="color-version-toggle"
        />
        <p className="text-sm text-muted-foreground">
          Tailwind v4 colors are more vivid and colorful.
        </p>
      </div>
    </div>
  )
}

function GeneralSettings() {
  const [defaultBoard, setDefaultBoard] = useState("featured")

  const TABS = [
    { label: "Featured", value: "featured" },
    { label: "Forks", value: "forks" },
    { label: "Stars", value: "stars" },
    { label: "Last Used", value: "last" },
  ] as const

  useEffect(() => {
    const saved = localStorage.getItem(DEFAULT_BOARD_KEY)
    if (saved) {
      setDefaultBoard(saved === "recommend" ? "featured" : saved)
    }
  }, [])

  const handleDefaultBoardChange = (value: string) => {
    setDefaultBoard(value)
    localStorage.setItem(DEFAULT_BOARD_KEY, value)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Default Tab</Label>
        <SegmentedControl
          items={TABS}
          value={defaultBoard}
          onValueChange={handleDefaultBoardChange}
          layoutId="default-board-tab"
        />
        <p className="text-sm text-muted-foreground">
          Choose which tab to show when the extension opens.
        </p>
      </div>
    </div>
  )
}

function AccountSettings({ initialError }: { initialError?: string | null }) {
  const { data: session, isPending, refetch } = authClient.useSession()
  const [error, setError] = useState<string | null>(initialError ?? null)
  const [signingInProvider, setSigningInProvider] = useState<AuthProviderId | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)

  useEffect(() => {
    setError(initialError ?? null)
  }, [initialError])

  async function handleSignIn(provider: AuthProviderId): Promise<void> {
    setError(null)
    setSigningInProvider(provider)

    const { error } = await signInWithProvider(provider)

    if (error) {
      setSigningInProvider(null)
      setError(formatSignInError(provider, error))
    }
  }

  async function handleSignOut(): Promise<void> {
    setError(null)
    setIsSigningOut(true)

    const { error } = await authClient.signOut()
    setIsSigningOut(false)

    if (error) {
      setError(error.message || "Sign-out failed.")
      return
    }

    await refetch()
  }

  if (isPending) {
    return (
      <div className="flex min-h-32 items-center justify-center">
        <Spinner className="size-5 text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {session
        ? (
            <div className="flex items-center gap-3 rounded-2xl bg-muted/40 p-3">
              {session.user.image
                ? (
                    <img
                      alt=""
                      className="size-10 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                      src={session.user.image}
                    />
                  )
                : (
                    <div className="flex size-10 items-center justify-center rounded-full bg-theme-500 text-sm font-semibold text-white">
                      {session.user.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
              <div className="min-w-0">
                <div className="truncate font-medium">
                  {session.user.name}
                </div>
                <div className="truncate text-sm text-muted-foreground">
                  {session.user.email}
                </div>
              </div>
            </div>
          )
        : (
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={Boolean(signingInProvider)}
                onClick={() => handleSignIn("github")}
              >
                {signingInProvider === "github" ? <Spinner /> : <PhGithubLogoDuotone />}
                Sign in with GitHub
              </Button>
              <Button
                disabled={Boolean(signingInProvider)}
                variant="outline"
                onClick={() => handleSignIn("google")}
              >
                {signingInProvider === "google" ? <Spinner /> : <PhGoogleLogoDuotone />}
                Sign in with Google
              </Button>
            </div>
          )}

      {error && (
        <p className="rounded-2xl bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {session && (
        <Button
          disabled={isSigningOut}
          variant="outline"
          onClick={handleSignOut}
        >
          {isSigningOut ? <Spinner /> : <LogOut />}
          Sign out
        </Button>
      )}
    </div>
  )
}

function formatSignInError(provider: AuthProviderId, error: string): string {
  const providerName = provider === "github" ? "GitHub" : "Google"
  return `${providerName} sign-in failed: ${error}`
}
