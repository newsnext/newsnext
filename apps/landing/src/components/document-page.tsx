import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { SiteFooter } from "./site-footer"
import { SiteShell } from "./site-shell"

export function DocumentPage({ title, children }: { title: string, children: ReactNode }): React.JSX.Element {
  return (
    <SiteShell>
      <header className="mx-auto w-full max-w-2xl text-sm leading-normal"><Link to="/" className="hover:underline">← NewsNext</Link></header>
      <main id="content" className="mx-auto w-full max-w-2xl flex-1 pt-12 pb-16 wrap-anywhere [&_a]:underline [&_a]:underline-offset-3 [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:leading-normal [&_h2]:font-semibold [&_p]:mb-4 [&_p]:leading-relaxed">
        <h1 className="mb-4 text-3xl sm:text-5xl leading-tight font-semibold tracking-tight">{title}</h1>
        {children}
      </main>
      <SiteFooter />
    </SiteShell>
  )
}
