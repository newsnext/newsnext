import DOMPurify from "dompurify"
import { useMemo } from "react"

export interface SafeHtmlProps {
  as?: "div" | "span"
  className?: string
  html: string
}

export function SafeHtml({
  as = "span",
  className,
  html,
}: SafeHtmlProps): React.JSX.Element {
  const sanitizedHtml = useMemo(() => DOMPurify.sanitize(html), [html])

  if (as === "div") {
    return (
      <div
        className={className}
        // The value is sanitized by DOMPurify immediately above.
        // eslint-disable-next-line react/dom-no-dangerously-set-innerhtml
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    )
  }

  return (
    <span
      className={className}
      // The value is sanitized by DOMPurify immediately above.
      // eslint-disable-next-line react/dom-no-dangerously-set-innerhtml
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  )
}
