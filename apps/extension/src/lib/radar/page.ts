import type { HtmlTraversal } from "@newsnext/source/types"
import type { RadarPageScript } from "./matcher"
import type { RadarPageQuery } from "./page-query"
import { browser } from "#imports"
import { getRadarPageQueryKey } from "./page-query"

const MAX_PAGE_SELECTION_LENGTH = 20_000

export async function readRadarPageScriptValues(
  tabId: number,
  scripts: readonly RadarPageScript[],
): Promise<Record<string, unknown>> {
  const entries = await Promise.all(scripts.map(async ({ key, script }) => {
    const [executionResult] = await browser.scripting.executeScript({
      target: { tabId },
      func: script,
    }).catch(() => [])
    return [key, executionResult?.result] as const
  }))
  return Object.fromEntries(entries.filter((entry): entry is readonly [string, unknown] => (
    entry[1] !== undefined && entry[1] !== null
  )))
}

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
