import type { SettingsTabId } from "../settings"
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
import { authClient } from "@/lib/auth-client"
import { PhGearDuotone, PhGithubLogoDuotone, PhUserDuotone } from "../icons/ph"
import { SettingsModal } from "../settings"

export function UserMenu() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<SettingsTabId>("appearance")
  const [isSigningIn, setIsSigningIn] = useState(false)
  const { data: session, isPending } = authClient.useSession()
  const userName = session?.user.name || "Guest"
  const hasUserImage = Boolean(session?.user.image)

  function openSettings(tab: SettingsTabId = "appearance"): void {
    setSettingsTab(tab)
    setIsSettingsOpen(true)
  }

  async function handleGithubSignIn(): Promise<void> {
    setIsSigningIn(true)

    const { error } = await signInWithGithub()

    if (error) {
      setIsSigningIn(false)
      openSettings("account")
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
                  <DropdownMenuItem
                    disabled={isSigningIn}
                    onClick={handleGithubSignIn}
                  >
                    {isSigningIn
                      ? <Spinner className="size-4" />
                      : <PhGithubLogoDuotone className="size-4" />}
                    Sign in with GitHub
                  </DropdownMenuItem>
                )}
            <DropdownMenuItem onClick={() => openSettings()}>
              <PhGearDuotone className="size-4" />
              Settings
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <SettingsModal
        initialTab={settingsTab}
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />
    </>
  )
}

async function signInWithGithub(): Promise<{ error: string | null }> {
  const { error } = await authClient.signIn.social({
    provider: "github",
    callbackURL: window.location.href,
    errorCallbackURL: window.location.href,
  })

  return {
    error: error?.message || null,
  }
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
