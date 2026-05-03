import { Logo } from "../icons/logo"

export function Footer(): React.JSX.Element {
  const year = new Date().getFullYear()

  return (
    <footer
      className="shrink-0 my-10 flex-col-center border-t border-border/40 px-2 pt-10 text-center text-xs text-muted-foreground sm:text-sm"
      role="contentinfo"
    >
      <p className="leading-relaxed flex-center gap-1">
        <Logo className="size-4 text-theme-500" />
        <span className="font-brand font-bold whitespace-nowrap cursor-pointer transition-opacity">
          News
          <span className="text-theme-500">N</span>
          ext
        </span>
        <span className="tabular-nums">
          ©
          {year}
        </span>
        <span>
          by
          {" "}
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
      <p className="max-w-prose leading-relaxed">
        <span className="tabular-nums">The next official version of</span>
        { " " }
        <a
          href="https://github.com/ourongxing/newsnow"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-theme-500 underline-offset-4 transition-colors hover:text-theme-600 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-500"
        >
          ouronxging/newsnow
        </a>
      </p>
    </footer>
  )
}
