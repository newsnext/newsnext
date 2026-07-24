import { Logo } from "../icons/logo"
import { WordmarkLogo } from "../icons/wordmark-logo"

const CURRENT_YEAR = new Date().getFullYear()

export function Footer(): React.JSX.Element {
  return (
    <footer
      className="shrink-0 my-10 flex-col-center px-2 pt-10 text-center text-xs text-muted-foreground sm:text-sm"
    >
      <p className="leading-relaxed flex-center gap-1">
        <Logo className="size-4 text-theme-500" />
        <WordmarkLogo className="w-[4.6em] h-auto cursor-pointer transition-opacity" accentClassName="text-theme-500" />
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
