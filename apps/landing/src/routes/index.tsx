import { WordmarkLogo } from "@newsnext/ui/components/wordmark-logo"
import { GithubLogo } from "@phosphor-icons/react/ssr"
import { createFileRoute } from "@tanstack/react-router"
import iconUrl from "../../../extension/public/icon/icon.svg?url"
import { SiteFooter } from "../components/site-footer"

export const Route = createFileRoute("/")({
  head: () => ({ links: [{ rel: "canonical", href: "https://newsnext.app/" }] }),
  component: LandingPage,
})

function LandingPage() {
  return (
    <div className="site-shell">
      <a className="skip-link" href="#content">Skip to content</a>
      <main className="intro landing-intro" id="content">
        <div className="brand" role="img" aria-label="NewsNext">
          <img className="brand-icon" src={iconUrl} alt="" width="128" height="128" />
          <WordmarkLogo className="brand-wordmark" aria-hidden="true" />
        </div>
        <h1>
          <span>What’s next is</span>
          {" "}
          <span>happening now</span>
        </h1>
        <p className="description">
          Your personal dashboard for updates as they happen.
        </p>
        <a className="primary-action" href="https://github.com/newsnext/newsnext" target="_blank" rel="noreferrer">
          <GithubLogo size={16} aria-hidden="true" />
          <span>Explore on GitHub</span>
        </a>
      </main>
      <SiteFooter />
    </div>
  )
}
