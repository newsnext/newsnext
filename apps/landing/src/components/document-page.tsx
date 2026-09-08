import type { ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { SiteFooter } from "./site-footer"

export function DocumentPage({ title, children }: { title: string, children: ReactNode }): React.JSX.Element {
  return (
    <div className="site-shell">
      <a className="skip-link" href="#content">Skip to content</a>
      <header className="document-header"><Link to="/">← NewsNext</Link></header>
      <main id="content" className="document">
        <h1>{title}</h1>
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}
