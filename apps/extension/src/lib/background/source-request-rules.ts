import type { SourceRequestRule } from "@newsnext/source/types"
import { loadSourceDescriptors } from "@newsnext/source/runtime"
import { browser } from "#imports"

const MANAGED_RULE_ID_START = 1_000_000_000
const MANAGED_RULE_ID_LIMIT = 1_000_005_000
let synchronizationQueue = Promise.resolve()

function isManagedRuleId(ruleId: number): boolean {
  return ruleId >= MANAGED_RULE_ID_START && ruleId < MANAGED_RULE_ID_LIMIT
}

function getUniqueRequestRules(requestRules: readonly SourceRequestRule[]): SourceRequestRule[] {
  const rulesByKey = new Map<string, SourceRequestRule>()
  for (const requestRule of requestRules) {
    const key = JSON.stringify(requestRule)
    if (!rulesByKey.has(key)) {
      rulesByKey.set(key, requestRule)
    }
  }
  return [...rulesByKey.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, rule]) => rule)
}

async function applySourceRequestRules(
  requestRules: readonly SourceRequestRule[],
): Promise<void> {
  const declarativeNetRequest = browser.declarativeNetRequest
  if (!declarativeNetRequest?.getSessionRules || !declarativeNetRequest.updateSessionRules) {
    return
  }

  const uniqueRules = getUniqueRequestRules(requestRules)
  if (MANAGED_RULE_ID_START + uniqueRules.length > MANAGED_RULE_ID_LIMIT) {
    throw new Error("Source request rules exceed the extension session rule limit")
  }
  const existingRules = await declarativeNetRequest.getSessionRules()
  await declarativeNetRequest.updateSessionRules({
    removeRuleIds: existingRules
      .map(rule => rule.id)
      .filter(isManagedRuleId),
    addRules: uniqueRules.map((requestRule, index) => ({
      id: MANAGED_RULE_ID_START + index,
      priority: requestRule.priority ?? 1,
      action: requestRule.action,
      condition: {
        ...requestRule.condition,
        initiatorDomains: [browser.runtime.id],
      },
    })),
  })
}

export function syncSourceRequestRules(
  requestRules: readonly SourceRequestRule[],
): Promise<void> {
  const synchronize = (): Promise<void> => applySourceRequestRules(requestRules)
  synchronizationQueue = synchronizationQueue.then(synchronize, synchronize)
  return synchronizationQueue
}

export async function syncConfiguredSourceRequestRules(): Promise<void> {
  const sources = await loadSourceDescriptors()
  await syncSourceRequestRules(sources.flatMap(source => source.requestRules ?? []))
}
