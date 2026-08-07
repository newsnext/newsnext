import { Streamdown } from "streamdown"

interface MarkdownTextProps {
  streaming: boolean
  text: string
}

export function MarkdownText({ streaming, text }: MarkdownTextProps): React.JSX.Element {
  return (
    <Streamdown
      animated={streaming ? { animation: "fadeIn", duration: 180, sep: "word" } : false}
      caret={streaming ? "block" : undefined}
      className="text-[13px] leading-5.5 text-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:border-s-2 [&_blockquote]:border-foreground/15 [&_blockquote]:ps-3 [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_hr]:border-foreground/10 [&_p]:my-2.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_table]:min-w-max"
      controls={{ code: { copy: true, download: false }, table: false }}
      isAnimating={streaming}
      mode={streaming ? "streaming" : "static"}
    >
      {text}
    </Streamdown>
  )
}
