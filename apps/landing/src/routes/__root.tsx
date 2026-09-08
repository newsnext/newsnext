/// <reference types="vite/client" />

import type { ReactNode } from "react"

import { createRootRoute, HeadContent, Link, Scripts } from "@tanstack/react-router"

import iconUrl from "../../../extension/public/icon/icon.svg?url"
import appCss from "../styles.css?url"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "NewsNext — What’s next is happening now" },
      {
        name: "description",
        content: "NewsNext pairs a browser extension with a local desktop App for live Sources, durable History, and agent-ready context.",
      },
      { name: "theme-color", content: "#f7f7f7", media: "(prefers-color-scheme: light)" },
      { name: "theme-color", content: "#171717", media: "(prefers-color-scheme: dark)" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://newsnext.app/" },
      { property: "og:site_name", content: "NewsNext" },
      { property: "og:title", content: "What’s next is happening now" },
      {
        property: "og:description",
        content: "A browser extension for live Sources and a local desktop App for durable context.",
      },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "NewsNext — What’s next is happening now" },
      {
        name: "twitter:description",
        content: "Browser-native Sources, local History, and one model for you and your agents.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: iconUrl },
    ],
  }),
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
})

function NotFound() {
  return (
    <div className="site-shell">
      <main className="intro">
        <img src={iconUrl} alt="NewsNext" width="40" height="40" />
        <h1>Page not found.</h1>
        <p className="description">The page you are looking for does not exist.</p>
        <Link to="/" className="primary-action">Return home</Link>
      </main>
    </div>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
