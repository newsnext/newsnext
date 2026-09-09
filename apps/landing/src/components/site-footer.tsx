import { Link } from "@tanstack/react-router"

export function SiteFooter(): React.JSX.Element {
  return (
    <footer className="flex flex-col items-center gap-1 text-center text-xs text-(--muted)">
      <p className="max-w-sm leading-6 text-balance text-(--muted)/80">
        newsnext is the next version of
        {" "}
        <a className="inline-flex min-h-8 items-center font-medium text-(--muted) underline decoration-(--muted)/30 underline-offset-4 hover:text-(--heading)" href="https://github.com/ourongxing/newsnow" target="_blank" rel="noreferrer">ourongxing/newsnow</a>
      </p>
      <nav className="flex items-center justify-center gap-1 [&_a]:inline-flex [&_a]:min-h-8 [&_a]:items-center [&_a]:px-2 [&_a:hover]:text-(--heading) [&_a:hover]:underline [&_a]:underline-offset-4" aria-label="Footer navigation">
        <Link to="/privacy">Privacy</Link>
        <span className="text-(--muted)/40" aria-hidden="true">·</span>
        <Link to="/support">Support</Link>
      </nav>
    </footer>
  )
}
