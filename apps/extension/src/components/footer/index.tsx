import { Logo } from "@newsnext/ui/components/logo"
import { WordmarkLogo } from "@newsnext/ui/components/wordmark-logo"

const CURRENT_YEAR = new Date().getFullYear()

export function Footer(): React.JSX.Element {
  return (
    <footer
      className="shrink-0 my-10 flex-col-center px-2 pt-10 text-center text-xs text-muted-foreground sm:text-sm"
    >
      <p className="leading-relaxed flex-center gap-1">
        <Logo className="size-4 text-primary" />
        <WordmarkLogo className="w-[4.6em] h-auto transition-opacity" />
        <span className="tabular-nums">
          ©
          {CURRENT_YEAR}
        </span>
        <span>
          by
          {" "}
          <a
            href="https://ourongxing.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline-offset-4 transition-colors hover:text-theme-600 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
          className="font-medium text-primary underline-offset-4 transition-colors hover:text-theme-600 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          ouronxging/newsnow
        </a>
      </p>
    </footer>
  )
}
