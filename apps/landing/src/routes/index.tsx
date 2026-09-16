import type { ReactNode } from "react"
import { WordmarkLogo } from "@newsnext/ui/components/wordmark-logo"
import { GithubLogo } from "@phosphor-icons/react/ssr"
import { createFileRoute } from "@tanstack/react-router"
import confetti from "canvas-confetti"
import { useEffect } from "react"
import iconUrl from "../../../extension/public/icon/icon.svg?url"
import { SiteFooter } from "../components/site-footer"
import { SiteShell } from "../components/site-shell"

const WAITLIST_URL = "https://tally.so/r/yPBBYg"

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { success?: boolean } => ({
    success: search.success === "" || search.success === true || search.success === "true" ? true : undefined,
  }),
  head: () => ({ links: [{ rel: "canonical", href: "https://newsnext.app/" }] }),
  component: LandingPage,
})

function LandingPage() {
  const { success } = Route.useSearch()
  return (
    <SiteShell>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center pt-12 pb-16 sm:pt-16 sm:pb-24 lg:pt-20 lg:pb-28 text-center" id="content">
        <div className="flex flex-col items-center gap-5" role="img" aria-label="NewsNext">
          <img className="h-auto w-24 drop-shadow-brand sm:w-32 dark:drop-shadow-black/20" src={iconUrl} alt="" width="128" height="128" />
          <WordmarkLogo className="h-auto w-32 text-(--heading)" aria-hidden="true" />
        </div>
        <div className="mt-8 w-full max-w-lg">
          <h1 className="text-2xl sm:text-3xl leading-tight font-medium tracking-tight text-balance text-(--heading)">Your personal dashboard</h1>
          <p className="mt-5 grid grid-cols-3 items-center gap-2 sm:gap-5">
            <IntroOutcome label="Live updates">
              <circle cx="18" cy="10" r="2" fill="currentColor" stroke="none" />
              <path d="M13 6A6 6 0 0 0 13 14M23 6A6 6 0 0 1 23 14M9 3A10 10 0 0 0 9 17M27 3A10 10 0 0 1 27 17" />
            </IntroOutcome>
            {" "}
            <IntroOutcome label="Track changes">
              <path d="M1 13H9L14 5L21 16L27 9H35" />
            </IntroOutcome>
            {" "}
            <IntroOutcome label="Spot trends">
              <path d="M1 17L11 13L19 15L34 3M26 3H34V11" />
            </IntroOutcome>
          </p>
        </div>
        <a className="mt-7 inline-flex min-h-12 w-56 items-center justify-center gap-2 rounded-full bg-(--action) px-6 py-3 text-sm leading-normal font-medium text-(--background) transition-colors duration-150 ease-out hover:bg-(--action-hover) motion-reduce:transition-none" href="https://github.com/newsnext/newsnext" target="_blank" rel="noreferrer">
          <GithubLogo size={16} aria-hidden="true" />
          <span>Explore on GitHub</span>
        </a>
        {success ? <WaitlistJoined /> : <WaitlistCta />}
      </main>
      <SiteFooter />
    </SiteShell>
  )
}

function WaitlistCta() {
  return (
    <div className="mt-5 flex flex-col items-center gap-2.5">
      <a className="inline-flex min-h-12 w-56 items-center justify-center gap-2 rounded-full bg-(--color-theme-500) px-6 py-3 text-sm leading-normal font-medium text-white transition-colors duration-150 ease-out hover:bg-(--color-theme-600) motion-reduce:transition-none" href={WAITLIST_URL} target="_blank" rel="noreferrer">
        <span>Join the waitlist</span>
      </a>
      <p className="text-xs leading-normal text-balance text-(--muted)">
        Get launch updates and vote for the sources you need.
      </p>
    </div>
  )
}

function WaitlistJoined() {
  useEffect(() => {
    // Drop the Tally redirect query string from the address bar.
    window.history.replaceState(window.history.state, "", "/")
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const colors = ["#f87171", "#ef4444", "#dc2626", "#ffffff"]
    confetti({ particleCount: 90, spread: 70, startVelocity: 35, origin: { y: 0.6 }, colors })
    const timer = setTimeout(() => {
      confetti({ particleCount: 60, spread: 100, scalar: 0.9, origin: { y: 0.5 }, colors })
    }, 250)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="mt-5 flex flex-col items-center gap-2.5" role="status">
      <p className="inline-flex min-h-12 w-56 items-center justify-center rounded-full bg-(--color-theme-500) px-6 py-3 text-sm leading-normal font-medium text-white">
        You're on the list!
      </p>
      <p className="text-xs leading-normal text-balance text-(--muted)">
        We'll email you when NewsNext is ready.
      </p>
    </div>
  )
}

function IntroOutcome({ label, children }: { label: string, children: ReactNode }) {
  return (
    <span className="flex flex-col items-center justify-center gap-1.5 text-xs leading-normal font-medium whitespace-nowrap text-(--muted) sm:flex-row sm:gap-2 sm:text-sm">
      <svg className="h-5 w-7 flex-none stroke-current text-(--accent)" viewBox="0 0 36 20" fill="none" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
      </svg>
      {label}
    </span>
  )
}
