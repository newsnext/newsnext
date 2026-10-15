import { load } from "cheerio"
import rehypeParse from "rehype-parse"
import rehypeRemark from "rehype-remark"
import remarkGfm from "remark-gfm"
import remarkStringify from "remark-stringify"
import { unified } from "unified"

let htmlConverter: ReturnType<typeof createHtmlConverter> | undefined

function createHtmlConverter() {
  return unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeRemark)
    .use(remarkGfm)
    .use(remarkStringify)
}

/** Convert collected HTML into GFM without retaining raw HTML or active embeds. */
export function htmlToMarkdown(html: string, baseUrl?: string): string {
  const $ = load(html)
  $("script, style, iframe, object, embed, template, noscript").remove()
  for (const [selector, attribute] of [["a[href]", "href"], ["img[src]", "src"]] as const) {
    $(selector).each((_, element) => {
      const node = $(element)
      const value = node.attr(attribute)
      if (!value) return
      try {
        const url = new URL(value, baseUrl)
        if (["http:", "https:", ...(attribute === "href" ? ["mailto:", "tel:"] : [])].includes(url.protocol)) {
          node.attr(attribute, url.href)
        } else {
          node.removeAttr(attribute)
        }
      } catch {
        node.removeAttr(attribute)
      }
    })
  }
  $("a:not([href])").each((_, element) => {
    const node = $(element)
    node.replaceWith(node.contents())
  })
  $("img:not([src])").remove()
  // Markdown tables cannot represent captions; preserve them as preceding paragraphs.
  $("table > caption").each((_, element) => {
    const caption = $(element)
    caption.parent().before($("<p></p>").append(caption.contents()))
    caption.remove()
  })
  $("table").each((_, element) => {
    const table = $(element)
    if (table.find("tr").length === 0) table.replaceWith(table.contents())
  })
  return String((htmlConverter ??= createHtmlConverter()).processSync($.html())).trim()
}
