import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@newsnext/ui/components/avatar"
import { Button } from "@newsnext/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@newsnext/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@newsnext/ui/components/dropdown-menu"
import { Spinner } from "@newsnext/ui/components/spinner"
import { cn } from "@newsnext/ui/lib/utils"
import { LogOut } from "lucide-react"
import { useState } from "react"
import { authClient } from "@/lib/auth-client"
import { PhGearDuotone, PhGithubLogoDuotone, PhUserDuotone } from "../icons/ph"
import { SettingsModal } from "../settings"

export function UserMenu() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const { data: session, isPending } = authClient.useSession()
  const userName = session?.user.name || "Guest"
  const hasUserImage = Boolean(session?.user.image)

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
            : <UserAvatar image={session?.user.image} name={userName} size="lg" />}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-2 py-2.5">
              <div className="flex items-center gap-3">
                <UserAvatar image={session?.user.image} name={userName} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">
                    {userName}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {session?.user.email || "Not signed in"}
                  </div>
                </div>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setIsAccountOpen(true)}>
              <PhUserDuotone className="size-4" />
              Account
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsSettingsOpen(true)}>
              <PhGearDuotone className="size-4" />
              Settings
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <SettingsModal open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
      <AccountModal open={isAccountOpen} onOpenChange={setIsAccountOpen} />
    </>
  )
}

function AccountModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { data: session, isPending, refetch } = authClient.useSession()
  const [error, setError] = useState<string | null>(null)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function handleGithubSignIn(): Promise<void> {
    setError(null)
    setIsSigningIn(true)

    const { error } = await authClient.signIn.social({
      provider: "github",
      callbackURL: window.location.href,
      errorCallbackURL: window.location.href,
    })

    if (error) {
      setIsSigningIn(false)
      setError(error.message || "GitHub sign-in failed.")
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Account</DialogTitle>
          <DialogDescription>
            {session ? "Signed in with GitHub." : "Use GitHub to sign in."}
          </DialogDescription>
        </DialogHeader>

        {isPending
          ? (
              <div className="flex min-h-32 items-center justify-center">
                <Spinner className="size-5 text-muted-foreground" />
              </div>
            )
          : session
            ? (
                <div className="flex items-center gap-3 rounded-2xl bg-muted/40 p-3">
                  <UserAvatar image={session.user.image} name={session.user.name} size="lg" />
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
                <Button
                  className="w-full"
                  disabled={isSigningIn}
                  onClick={handleGithubSignIn}
                >
                  {isSigningIn ? <Spinner /> : <PhGithubLogoDuotone />}
                  Continue with GitHub
                </Button>
              )}

        {error && (
          <p className="rounded-2xl bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        {session && (
          <DialogFooter>
            <Button
              disabled={isSigningOut}
              variant="outline"
              onClick={handleSignOut}
            >
              {isSigningOut ? <Spinner /> : <LogOut />}
              Sign out
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
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
