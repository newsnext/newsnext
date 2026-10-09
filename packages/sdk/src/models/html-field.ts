export type HtmlTraversal
  = { type: "closest", selector: string }
    | { type: "next", selector?: string }
    | { type: "parent" }
    | { type: "previous", selector?: string }
    | { type: "siblings", selector?: string }

export interface HtmlFieldConfig {
  select?: string | readonly string[]
  scope?: "document" | "item"
  traverse?: HtmlTraversal | readonly HtmlTraversal[]
  attr?: string
  content?: "html" | "outerHtml" | "text"
  brSeparator?: string
  all?: boolean
  separator?: string
  template?: string
}

export type HtmlField = string | HtmlFieldConfig

/** Extract strict JSON from the first matching HTML element, without executing scripts. */
export interface EmbeddedJsonOptions {
  /** CSS selector, such as `script#__NEXT_DATA__` or `script[type="application/ld+json"]`. */
  select: string
  /** Read a JSON-valued attribute instead of the element's text content. */
  attr?: string
}
