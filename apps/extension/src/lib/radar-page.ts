import type { HtmlTraversal } from "@newsnext/source/types"
import type { RadarFeed } from "@/lib/radar"
import type { RadarPageQuery } from "@/lib/radar-page-query"
import { browser } from "#imports"
import { getRadarPageQueryKey } from "@/lib/radar-page-query"

const MAX_PAGE_SELECTION_LENGTH = 20_000
const MAX_PAGE_FEEDS = 20
const MAX_FEED_TITLE_LENGTH = 500

export async function readRadarPageSelections(
  tabId: number,
  queries: readonly RadarPageQuery[],
): Promise<Record<string, string>> {
  if (!queries.length) {
    return {}
  }

  const [executionResult] = await browser.scripting.executeScript<
    [RadarPageQuery[], number],
    Array<string | null>
  >({
    target: { tabId },
    args: [[...queries], MAX_PAGE_SELECTION_LENGTH],
    func: (pageQueries, maxLength) => pageQueries.map((query) => {
      try {
        type Root = Document | Element

        const traverseRoots = (
          roots: Root[],
          traversal: HtmlTraversal,
        ): Root[] => roots.flatMap((root) => {
          if (!(root instanceof Element)) return []
          switch (traversal.type) {
            case "closest": {
              const match = root.closest(traversal.selector)
              return match ? [match] : []
            }
            case "next": {
              const match = root.nextElementSibling
              return match && (!traversal.selector || match.matches(traversal.selector))
                ? [match]
                : []
            }
            case "parent":
              return root.parentElement ? [root.parentElement] : []
            case "previous": {
              const match = root.previousElementSibling
              return match && (!traversal.selector || match.matches(traversal.selector))
                ? [match]
                : []
            }
            case "siblings":
              return root.parentElement
                ? [...root.parentElement.children].filter(element =>
                    element !== root
                    && (!traversal.selector || element.matches(traversal.selector)))
                : []
            default:
              return []
          }
        })

        const traversals = query.traverse
          ? (Array.isArray(query.traverse) ? query.traverse : [query.traverse])
          : []
        const initialRoot: Root = query.scope === "document"
          ? document
          : document.documentElement
        const roots = traversals.reduce<Root[]>(
          (current, traversal) => traverseRoots(current, traversal),
          [initialRoot],
        )
        const selectors = typeof query.select === "string"
          ? [query.select]
          : query.select ?? [""]

        let targets: Root[] = []
        for (const selector of selectors) {
          if (!selector) {
            targets = roots
          } else {
            const relativeSelector = /^[>+~]/.test(selector.trim())
              ? `:scope ${selector}`
              : selector
            targets = roots.flatMap((root) => {
              const selectionRoot = root instanceof Document && relativeSelector.startsWith(":scope ")
                ? root.documentElement
                : root
              return [...selectionRoot.querySelectorAll(relativeSelector)]
            })
          }
          if (targets.length) break
        }

        const extractValue = (target: Root): string | null => {
          if (query.attr) {
            return target instanceof Element
              ? target.getAttribute(query.attr)
              : null
          }

          const element = target instanceof Document ? target.documentElement : target
          switch (query.content) {
            case "html":
              return element.innerHTML
            case "outerHtml":
              return element.outerHTML
            case "text":
            case undefined: {
              if (query.brSeparator === undefined) {
                return element.textContent?.trim() ?? null
              }
              const clone = element.cloneNode(true) as Element
              clone.querySelectorAll("br").forEach(br =>
                br.replaceWith(document.createTextNode(query.brSeparator ?? "")))
              return clone.textContent?.trim() ?? null
            }
          }
        }

        const values = query.all
          ? targets.map(extractValue).filter((value): value is string => value !== null)
          : [targets[0] ? extractValue(targets[0]) : null]
        const value = query.all
          ? values.join(query.separator ?? "")
          : values[0]
        return value?.slice(0, maxLength) || null
      } catch {
        return null
      }
    }),
  }).catch(() => [])

  const selections: Record<string, string> = {}
  executionResult?.result?.forEach((value, index) => {
    const query = queries[index]
    if (query && value) {
      selections[getRadarPageQueryKey(query)] = value
    }
  })
  return selections
}

export async function readRadarPageFeeds(tabId: number): Promise<RadarFeed[]> {
  const [executionResult] = await browser.scripting.executeScript<
    [number, number],
    RadarFeed[]
  >({
    target: { tabId },
    args: [MAX_PAGE_FEEDS, MAX_FEED_TITLE_LENGTH],
    func: (maxFeeds, maxTitleLength) => {
      const supportedTypes = new Set([
        "application/atom+xml",
        "application/rss+xml",
      ])
      const feeds = [...(document.head?.querySelectorAll<HTMLLinkElement>("link[href]") ?? [])]
        .filter(link =>
          link.rel.split(/\s+/).some(value => value.toLowerCase() === "alternate")
          && supportedTypes.has(link.type.split(";", 1)[0]?.trim().toLowerCase() ?? ""))
        .map(link => ({
          url: link.href,
          ...(link.title.trim()
            ? { title: link.title.trim().slice(0, maxTitleLength) }
            : {}),
        }))

      const feedRoot = document
        .querySelector("#webkit-xml-viewer-source-xml")
        ?.firstElementChild
        ?? document.documentElement
      const feedRootName = feedRoot?.localName.toLowerCase()
      const isFeedDocument = feedRootName === "feed" || feedRootName === "rss"
      if (isFeedDocument && /^https?:$/.test(location.protocol)) {
        feeds.unshift({
          url: location.href,
          ...(document.title.trim()
            ? { title: document.title.trim().slice(0, maxTitleLength) }
            : {}),
        })
      }

      return [...new Map(
        feeds
          .filter(feed => /^https?:\/\//i.test(feed.url))
          .map(feed => [feed.url, feed]),
      ).values()].slice(0, maxFeeds)
    },
  }).catch(() => [])

  return executionResult?.result ?? []
}
