/// <reference types="vite/client" />

import type { ReactNode } from "react"

import { createRootRoute, HeadContent, Link, Scripts } from "@tanstack/react-router"

import iconUrl from "../../../extension/public/icon/icon.svg?url"

import { SiteShell } from "../components/site-shell"
import appCss from "../styles.css?url"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "NewsNext — Your personal dashboard" },
      {
        name: "description",
        content: "Your personal dashboard. Live updates. Track changes. Spot trends.",
      },
      { name: "theme-color", content: "#f7f7f7", media: "(prefers-color-scheme: light)" },
      { name: "theme-color", content: "#171717", media: "(prefers-color-scheme: dark)" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://newsnext.app/" },
      { property: "og:site_name", content: "NewsNext" },
      { property: "og:title", content: "NewsNext — Your personal dashboard" },
      {
        property: "og:description",
        content: "Your personal dashboard. Live updates. Track changes. Spot trends.",
      },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "NewsNext — Your personal dashboard" },
      {
        name: "twitter:description",
        content: "Your personal dashboard. Live updates. Track changes. Spot trends.",
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
    <SiteShell>
      <main id="content" className="flex flex-1 flex-col items-center justify-center py-16 text-center">
        <img src={iconUrl} alt="NewsNext" width="40" height="40" />
        <h1 className="mt-9 mb-5 text-4xl sm:text-6xl leading-tight font-semibold tracking-tighter">Page not found.</h1>
        <p className="max-w-md text-base leading-relaxed text-pretty text-(--muted)">The page you are looking for does not exist.</p>
        <Link to="/" className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-(--action) px-6 py-3 text-sm leading-normal font-medium text-(--background) transition-colors duration-150 ease-out hover:bg-(--action-hover) motion-reduce:transition-none">Return home</Link>
      </main>
    </SiteShell>
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
