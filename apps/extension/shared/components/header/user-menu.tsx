import type { SettingsTabId } from "../settings"
import type { AuthProviderId } from "@/lib/auth-client"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@newsnext/ui/components/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@newsnext/ui/components/dropdown-menu"
import { Spinner } from "@newsnext/ui/components/spinner"
import { cn } from "@newsnext/ui/lib/utils"
import { useState } from "react"
import { authClient, signInWithProvider } from "@/lib/auth-client"
import { PhGearDuotone, PhGithubLogoDuotone, PhGoogleLogoDuotone, PhUserDuotone } from "../icons/ph"
import { SettingsModal } from "../settings"

export function UserMenu() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<SettingsTabId>("appearance")
  const [accountError, setAccountError] = useState<string | null>(null)
  const [signingInProvider, setSigningInProvider] = useState<AuthProviderId | null>(null)
  const { data: session, isPending } = authClient.useSession()
  const userName = session?.user.name || "Guest"
  const hasUserImage = Boolean(session?.user.image)

  function openSettings(tab: SettingsTabId = "appearance", error: string | null = null): void {
    setAccountError(error)
    setSettingsTab(tab)
    setIsSettingsOpen(true)
  }

  async function handleSignIn(provider: AuthProviderId): Promise<void> {
    setSigningInProvider(provider)

    const { error } = await signInWithProvider(provider)

    if (error) {
      setSigningInProvider(null)
      openSettings("account", formatSignInError(provider, error))
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "flex size-10 items-center justify-center rounded-full text-white font-semibold text-base pointer-events-auto cursor-pointer outline-none",
            hasUserImage
              ? "bg-transparent"
              : "island-pill bg-linear-to-br from-theme-400 to-theme-600 hover:from-theme-500 hover:to-theme-700",
          )}
          title="User Profile"
        >
          {isPending
            ? <Spinner className="text-white" />
            : session
              ? <UserAvatar image={session.user.image} name={userName} size="lg" />
              : <PhUserDuotone className="size-5" />}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {session && (
            <>
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="px-2 py-2.5"
                  onClick={() => openSettings("account")}
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar image={session.user.image} name={userName} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-foreground">
                        {userName}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {session.user.email}
                      </div>
                    </div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuGroup>
            {session
              ? null
              : (
                  <>
                    <DropdownMenuItem
                      disabled={Boolean(signingInProvider)}
                      onClick={() => handleSignIn("github")}
                    >
                      {signingInProvider === "github"
                        ? <Spinner className="size-4" />
                        : <PhGithubLogoDuotone className="size-4" />}
                      Sign in with GitHub
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={Boolean(signingInProvider)}
                      onClick={() => handleSignIn("google")}
                    >
                      {signingInProvider === "google"
                        ? <Spinner className="size-4" />
                        : <PhGoogleLogoDuotone className="size-4" />}
                      Sign in with Google
                    </DropdownMenuItem>
                  </>
                )}
            <DropdownMenuItem onClick={() => openSettings()}>
              <PhGearDuotone className="size-4" />
              Settings
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <SettingsModal
        initialAccountError={accountError}
        initialTab={settingsTab}
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />
    </>
  )
}

function formatSignInError(provider: AuthProviderId, error: string): string {
  const providerName = provider === "github" ? "GitHub" : "Google"
  return `${providerName} sign-in failed: ${error}`
}

function UserAvatar({
  image,
  name,
  size = "default",
}: {
  image?: string | null
  name: string
  size?: "default" | "sm" | "lg"
}) {
  return (
    <Avatar
      className={image ? "bg-transparent text-white" : "bg-theme-500 text-white"}
      size={size}
    >
      {image && (
        <AvatarImage
          alt=""
          referrerPolicy="no-referrer"
          src={image}
        />
      )}
      <AvatarFallback className="bg-theme-500 text-sm font-semibold text-white">
        {name.slice(0, 1).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  )
}
