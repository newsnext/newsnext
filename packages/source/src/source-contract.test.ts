import { describe, expect, it } from "vitest"
import funcRegistry from "../func-registry.json" with { type: "json" }
import { loadSources } from "./service"
import { matchesCapabilityHost } from "./utils/source/capabilities"

const CACHE_MAX_AGE_PATTERN = /^\d+(?:\.\d+)?[smhd]$/
const CAPABILITY_HOST_PATTERN = /^(?:\*|(?:\*\.)?(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)$/i

function toSerializable(value: unknown): unknown {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value))
}

const sources = await loadSources()

describe("source contract", () => {
  const runtimeSources = Object.entries(sources).map(([id, source]) => ({
    id,
    sourceKey: id.split(":")[1],
    source,
  }))

  it("generates one descriptor for every runtime source", () => {
    expect(Object.keys(funcRegistry)).toHaveLength(runtimeSources.length)

    for (const { id, source } of runtimeSources) {
      const descriptor = funcRegistry[id as keyof typeof funcRegistry]
      expect(descriptor, id).toBeDefined()
      expect(descriptor?.cache, id).toEqual(source.cache)
      expect(descriptor?.capabilities, id).toEqual(source.capabilities)
      expect(descriptor && "params" in descriptor ? descriptor.params : undefined, id)
        .toEqual(toSerializable(source.params))
      expect(descriptor && "radar" in descriptor ? descriptor.radar : undefined, id)
        .toEqual(toSerializable(source.radar))
    }
  })

  it("provides executable loaders and valid cache policies", () => {
    for (const { id, sourceKey, source } of runtimeSources) {
      expect(source.key, id).toBe(sourceKey)
      expect(source.loader, id).toBeTypeOf("function")
      expect(source.cache.version, id).toBeGreaterThanOrEqual(1)
      expect(Number.isInteger(source.cache.version), id).toBe(true)
      expect(source.cache.maxAge, id).toMatch(CACHE_MAX_AGE_PATTERN)
    }
  })

  it("declares capabilities as duplicate-free lists", () => {
    for (const { id, source } of runtimeSources) {
      for (const capability of ["network", "cookies", "browser"] as const) {
        const values = source.capabilities[capability]
        expect(Array.isArray(values), `${id}:${capability}`).toBe(true)
        expect(new Set(values).size, `${id}:${capability}`).toBe(values.length)
        expect(values.every(value => value.trim().length > 0), `${id}:${capability}`).toBe(true)
      }

      for (const capability of ["network", "cookies"] as const) {
        expect(
          source.capabilities[capability].every(host => CAPABILITY_HOST_PATTERN.test(host)),
          `${id}:${capability}`,
        ).toBe(true)
      }
    }
  })

  it("declares every cookie secret origin as a cookie capability", () => {
    for (const { id, source } of runtimeSources) {
      for (const secret of source.secrets ?? []) {
        if (secret.type !== "cookie") {
          continue
        }

        const hostname = new URL(secret.origin).hostname
        expect(
          source.capabilities.cookies.some(host => matchesCapabilityHost(hostname, host)),
          `${id}:${secret.key}:${hostname}`,
        ).toBe(true)
      }
    }
  })

  it("keeps parameter defaults inside their declared values", () => {
    for (const { id, source } of runtimeSources) {
      for (const [paramKey, param] of Object.entries(source.params ?? {})) {
        if (typeof param !== "object" || param === null || !("type" in param)) {
          continue
        }

        if (
          param.type === "select"
          && "values" in param
          && Array.isArray(param.values)
          && "default" in param
        ) {
          expect(
            param.values.some(value => value.value === param.default),
            `${id}:${paramKey}`,
          ).toBe(true)
        }

        if (
          param.type === "multiselect"
          && "values" in param
          && Array.isArray(param.values)
          && "default" in param
          && Array.isArray(param.default)
        ) {
          const allowedValues = new Set(param.values.map(value => value.value))
          expect(
            param.default.every(value => allowedValues.has(value)),
            `${id}:${paramKey}`,
          ).toBe(true)
        }
      }
    }
  })

  it("uses unique radar rule IDs within each source", () => {
    for (const { id, source } of runtimeSources) {
      const ruleIds = source.radar?.map(rule => rule.id) ?? []
      expect(new Set(ruleIds).size, id).toBe(ruleIds.length)
    }
  })
})
