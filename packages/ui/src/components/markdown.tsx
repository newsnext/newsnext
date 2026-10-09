import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "../lib/utils"

export interface MarkdownProps {
  className?: string
  markdown: string
}

/** Render GFM as React elements; embedded HTML is always discarded. */
export function Markdown({ className, markdown }: MarkdownProps): React.JSX.Element {
  return (
    <div className={cn(
      "wrap-break-word [&_p]:mb-4 [&_p:last-child]:mb-0 [&_a]:underline [&_a]:underline-offset-3 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_li]:my-1 [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_code]:font-mono [&_table]:block [&_table]:overflow-x-auto [&_th]:border [&_th]:p-2 [&_td]:border [&_td]:p-2 [&_img]:max-w-full [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_h1]:my-4 [&_h2]:my-4 [&_h3]:my-3",
      className,
    )}
    >
      <ReactMarkdown skipHtml remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </div>
  )
}
