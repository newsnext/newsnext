export function Footer(): React.JSX.Element {
  const year = new Date().getFullYear()

  return (
    <footer
      className="shrink-0 my-10 flex-col-center border-t border-border/40 px-2 pt-10 text-center text-xs text-muted-foreground sm:text-sm"
      role="contentinfo"
    >
      <p className="max-w-prose leading-relaxed">
        <span className="tabular-nums">© {year} NewsNext.</span>{" "}
        <span>
          Made with ❤️ by{" "}
          <a
            href="https://ourongxing.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-theme-500 underline-offset-4 transition-colors hover:text-theme-600 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-500"
          >
            ourongxing
          </a>
        </span>
      </p>
    </footer>
  )
}
