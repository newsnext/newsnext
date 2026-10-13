import type { HtmlTraversal, SourceRadarPageParam } from "@newsnext/source-kit/types"
import type { RadarPageParam } from "./matcher"
import type { RadarPageQuery } from "./page-query"
import { resolveRadarPageParamValue } from "@newsnext/source-kit/core"
import { browser } from "#imports"
import { getRadarPageQueryKey } from "./page-query"
import { resolveRadarUrlParamValues } from "./url-params"

const MAX_PAGE_SELECTION_LENGTH = 20_000

/** A fixed reader accepts portable page queries rather than Source-owned executable code. */
export async function readRadarPageParamValues(
  tabId: number,
  url: string,
  params: readonly RadarPageParam[],
): Promise<Record<string, unknown>> {
  const urlValues = resolveRadarUrlParamValues(url, params)
  const selectedParams = params.filter(
    (param): param is RadarPageParam & { query: Extract<SourceRadarPageParam, { type: "selected" }> } => param.query.type === "selected",
  )
  if (!selectedParams.length) return urlValues
  const [executionResult] = await browser.scripting.executeScript<
    [typeof selectedParams],
    Promise<Record<string, unknown>>
  >({
    target: { tabId },
    args: [selectedParams],
    func: async (pageParams) => {
      const values: Record<string, unknown> = {}
      const panels = new Map<string, { ready: boolean, trigger?: HTMLElement }>()
      try {
        for (const { key, query } of pageParams) {
          try {
            if (query.reveal) {
              const reveal = query.reveal
              const panelKey = JSON.stringify(reveal)
              let panel = panels.get(panelKey)
              if (!panel) {
                const trigger = document.querySelector<HTMLElement>(reveal.trigger)
                panel = { ready: Boolean(trigger && (!reveal.active || trigger.matches(reveal.active))) }
                panels.set(panelKey, panel)
                if (panel.ready && !document.querySelector(reveal.visible) && trigger) {
                  panel.trigger = trigger
                  trigger.click()
                  await new Promise(resolve => setTimeout(resolve, reveal.waitMs ?? 0))
                }
              }
              if (!panel.ready) {
                values[key] = -1
                continue
              }
            }
            const root = query.group
              ? document.querySelectorAll(query.group.select)[query.group.index]
              : document
            const controls = root ? Array.from(root.querySelectorAll(query.select)) : []
            values[key] = controls.findIndex(control => control.matches(query.active))
          } catch {
            values[key] = null
          }
        }
      } finally {
        for (const panel of [...panels.values()].reverse()) panel.trigger?.click()
      }
      return values
    },
  }).catch(() => [])
  return { ...urlValues, ...Object.fromEntries(selectedParams.flatMap(({ key, query }) => {
    const value = resolveRadarPageParamValue(query, executionResult?.result?.[key])
    return value === undefined ? [] : [[key, value]]
  })) }
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
