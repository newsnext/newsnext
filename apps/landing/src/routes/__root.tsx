/// <reference types="vite/client" />

import type { ReactNode } from "react"

import { createRootRoute, HeadContent, Link, Scripts } from "@tanstack/react-router"

import faviconUrl from "../../../extension/public/icon.svg?url"
import appCss from "../styles.css?url"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "NewsNext — Follow now. Understand next." },
      {
        name: "description",
        content: "NewsNext pairs a browser extension with a local desktop App for live Sources, durable History, and agent-ready context.",
      },
      { name: "theme-color", content: "#e5e5e5" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://newsnext.app/" },
      { property: "og:site_name", content: "NewsNext" },
      { property: "og:title", content: "Follow now. Understand next." },
      {
        property: "og:description",
        content: "A browser extension for live Sources and a local desktop App for durable context.",
      },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "NewsNext" },
      {
        name: "twitter:description",
        content: "Browser-native Sources, local History, and one model for you and your agents.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: faviconUrl },
      { rel: "canonical", href: "https://newsnext.app/" },
    ],
  }),
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
})

function NotFound() {
  return (
    <main className="not-found">
      <img src={faviconUrl} alt="" width="52" height="52" />
      <p className="eyebrow">404 · Signal lost</p>
      <h1>This page moved beyond the board.</h1>
      <Link to="/" className="button button-primary">Return home</Link>
    </main>
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
