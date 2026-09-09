import type { ReactNode } from "react"

export function SiteShell({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <div className="flex min-h-svh flex-col px-6 sm:px-8 lg:px-16 pt-8 pb-6">
      <a className="fixed top-3 left-3 -translate-y-20 bg-(--action) px-4 py-2.5 text-(--background) focus:translate-y-0" href="#content">
        Skip to content
      </a>
      {children}
    </div>
  )
}
