import { Logo } from "@newsnext/ui/components/logo"
import { WordmarkLogo } from "@newsnext/ui/components/wordmark-logo"
import { ArrowRight, Browser, Desktop, GithubLogo } from "@phosphor-icons/react/ssr"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/")({
  component: LandingPage,
})

const GITHUB_URL = "https://github.com/newsnext/newsnext"

function LandingPage() {
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <SiteHeader />

      <main id="main">
        <section className="hero section-wrap" id="top">
          <div className="hero-copy">
            <p className="kicker">
              <i />
              {" "}
              NewsNext · App + Extension
            </p>
            <h1>
              Don&apos;t lose
              <br />
              <em>the plot.</em>
            </h1>
            <p className="hero-intro">
              Follow a changing web in the browser. Keep its history and context on your desktop.
            </p>
            <div className="hero-actions">
              <a className="primary-action" href={GITHUB_URL} target="_blank" rel="noreferrer">
                <GithubLogo weight="bold" />
                Explore on GitHub
              </a>
              <a className="plain-action" href="#how-it-works">
                Follow the thread
                <ArrowRight weight="bold" />
              </a>
            </div>
          </div>

          <ThreadField />
        </section>

        <div className="word-stream" aria-label="Follow, notice, remember, connect, ask">
          <div>
            <span>follow</span>
            <i className="dot dot-blue" />
            <span>notice</span>
            <i className="dot dot-yellow" />
            <span>remember</span>
            <i className="dot dot-purple" />
            <span>connect</span>
            <i className="dot dot-green" />
            <span>ask</span>
            <i className="dot dot-red" />
          </div>
        </div>

        <section className="handoff section-wrap" id="how-it-works">
          <header className="section-title">
            <p className="kicker">
              <i />
              {" "}
              One continuous thread
            </p>
            <h2>
              Catch it there.
              <br />
              Keep it here.
            </h2>
          </header>

          <div className="handoff-route">
            <article className="place place-browser">
              <div className="place-heading">
                <span className="place-index">Live</span>
                <Browser weight="duotone" />
              </div>
              <h3>In the browser</h3>
              <p>Sources run where your sessions, permissions, and pages already live.</p>
            </article>

            <div className="route-line" aria-hidden="true">
              <span className="route-start" />
              <span className="packet packet-one" />
              <span className="packet packet-two" />
              <span className="packet packet-three" />
              <ArrowRight weight="bold" />
            </div>

            <article className="place place-desktop">
              <div className="place-heading">
                <span className="place-index">Durable</span>
                <Desktop weight="duotone" />
              </div>
              <h3>On your desktop</h3>
              <p>History, Boards, CLI access, and agent context stay local and useful.</p>
            </article>
          </div>
        </section>

        <section className="context-section">
          <div className="context-inner section-wrap">
            <p className="context-lead">A feed tells you what is new.</p>
            <h2>NewsNext helps you see</h2>
            <div className="context-lines">
              <div className="context-line line-blue">
                <span>01</span>
                <strong>what changed,</strong>
                <i />
              </div>
              <div className="context-line line-purple">
                <span>02</span>
                <strong>why it mattered,</strong>
                <i />
              </div>
              <div className="context-line line-yellow">
                <span>03</span>
                <strong>and what comes next.</strong>
                <i />
              </div>
            </div>
          </div>
        </section>

        <section className="closing section-wrap">
          <div className="closing-mark" aria-hidden="true">
            <Logo />
            <span className="closing-orbit orbit-one" />
            <span className="closing-orbit orbit-two" />
            <span className="closing-orbit orbit-three" />
          </div>
          <div className="closing-copy">
            <p className="kicker">
              <i />
              {" "}
              The web keeps moving
            </p>
            <h2>Keep the thread.</h2>
            <p>The extension, Source runtime, registries, and shared TypeScript packages are open source. The desktop App is distributed separately.</p>
            <a className="primary-action light-action" href={GITHUB_URL} target="_blank" rel="noreferrer">
              See the open-source project
              <ArrowRight weight="bold" />
            </a>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}

function ThreadField() {
  return (
    <div className="thread-field" aria-label="Live web signals joining a continuous local thread">
      <svg viewBox="0 0 720 720" role="img" aria-hidden="true">
        <path className="track track-one" d="M55 95C230 95 189 284 364 284S492 610 673 610" />
        <path className="track track-two" d="M13 223C188 223 218 378 373 378S521 610 673 610" />
        <path className="track track-three" d="M105 483C245 483 249 451 388 451S509 610 673 610" />
        <path className="track track-main" d="M29 355C218 355 255 527 414 527S518 610 673 610" />
        <circle className="signal signal-blue" cx="55" cy="95" r="13" />
        <rect className="signal signal-yellow" x="0" y="207" width="27" height="27" rx="4" />
        <circle className="signal signal-purple" cx="105" cy="483" r="18" />
        <rect className="signal signal-green" x="13" y="339" width="32" height="32" rx="16" />
        <circle className="junction" cx="373" cy="378" r="8" />
        <circle className="junction" cx="414" cy="527" r="8" />
      </svg>

      <span className="thread-label label-source">live sources</span>
      <span className="thread-label label-change">what changed?</span>
      <span className="thread-label label-context">context</span>

      <div className="thread-destination">
        <Logo />
        <span>your thread</span>
      </div>
    </div>
  )
}

function SiteHeader() {
  return (
    <header className="site-header section-wrap">
      <a className="brand" href="#top" aria-label="NewsNext home">
        <Logo aria-hidden="true" />
        <WordmarkLogo />
      </a>
      <nav aria-label="Main navigation">
        <a href="#how-it-works">How it works</a>
        <a className="github-link" href={GITHUB_URL} target="_blank" rel="noreferrer">
          GitHub
          {" "}
          <GithubLogo weight="bold" />
        </a>
      </nav>
    </header>
  )
}

function SiteFooter() {
  return (
    <footer className="site-footer section-wrap">
      <a className="brand footer-brand" href="#top" aria-label="NewsNext home">
        <Logo aria-hidden="true" />
        <WordmarkLogo />
      </a>
      <p>App + browser extension · Built for a web that keeps moving.</p>
      <a href={GITHUB_URL} target="_blank" rel="noreferrer">
        MPL-2.0
        <GithubLogo weight="bold" />
      </a>
    </footer>
  )
}
