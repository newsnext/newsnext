import type {
  SourceRadarMetaPatch,
  SourceRadarParamPatch,
  SourceRadarPatchValue,
  SourceRadarRule,
  SourceRadarTransform,
  SourceRadarValue,
} from "../typings"

type RadarValueInput = SourceRadarValue | RadarValueBuilder
type RadarPatchInput = SourceRadarValue | SourceRadarPatchValue | RadarValueBuilder

interface RadarConfig {
  id: string
  hosts: string[]
  path?: string
  paths?: string[]
  includes?: string | string[]
  params?: Record<string, RadarPatchInput>
  meta?: SourceRadarMetaPatchInput
  confidence?: number
}

type SourceRadarMetaPatchInput = {
  [Key in keyof SourceRadarMetaPatch]?: SourceRadarMetaPatch[Key] | RadarValueBuilder
}

export class RadarValueBuilder {
  private readonly patchValue: SourceRadarPatchValue

  constructor(patchValue: SourceRadarPatchValue) {
    this.patchValue = patchValue
  }

  normalize(): RadarValueBuilder {
    return this.withTransform({ type: "normalizeWhitespace" })
  }

  replace(pattern: string, replacement: string): RadarValueBuilder {
    return this.withTransform({ type: "replace", pattern, replacement })
  }

  extract(pattern: string, options: { group?: number, fallbackToEmpty?: boolean } = {}): RadarValueBuilder {
    return this.withTransform({ type: "extract", pattern, ...options })
  }

  prepend(value: string): RadarValueBuilder {
    return this.withTransform({ type: "prepend", value })
  }

  template(value: string): RadarValueBuilder {
    return this.withTransform({ type: "template", value })
  }

  fallback(value: unknown): RadarValueBuilder {
    return new RadarValueBuilder({ ...this.patchValue, fallback: value })
  }

  default(value: unknown): RadarValueBuilder {
    return this.fallback(value)
  }

  toRadarPatchValue(): SourceRadarPatchValue {
    return this.patchValue
  }

  toRadarValue(): SourceRadarValue {
    return this.patchValue.value
  }

  private withTransform(transform: SourceRadarTransform): RadarValueBuilder {
    return new RadarValueBuilder({
      ...this.patchValue,
      transforms: [...(this.patchValue.transforms ?? []), transform],
    })
  }
}

export function $radar(config: RadarConfig): SourceRadarRule {
  return {
    id: config.id,
    match: {
      hosts: config.hosts,
      paths: config.paths ?? (config.path ? [config.path] : undefined),
      includes: config.includes,
    },
    paramsPatch: config.params ? mapParamsPatch(config.params) : undefined,
    metaPatch: config.meta ? mapMetaPatch(config.meta) : undefined,
    confidence: config.confidence,
  }
}

export function literal(value: unknown): SourceRadarValue {
  return { type: "literal", value }
}

export function path(name: string): RadarValueBuilder {
  return value({ type: "path", name })
}

export function query(name: string): RadarValueBuilder {
  return value({ type: "query", name })
}

export function hashQuery(name: string): RadarValueBuilder {
  return value({ type: "hashQuery", name })
}

export function pathSegmentWithPrefix(prefix: string): RadarValueBuilder {
  return value({ type: "pathSegmentWithPrefix", prefix })
}

export function first(...values: RadarValueInput[]): RadarValueBuilder {
  return value({ type: "first", values: values.map(toRadarValue) })
}

export function pageTitle(): RadarValueBuilder {
  return value({ type: "pageTitle" })
}

function value(source: SourceRadarValue): RadarValueBuilder {
  return new RadarValueBuilder({ value: source })
}

function mapParamsPatch(params: Record<string, RadarPatchInput>): SourceRadarParamPatch {
  return Object.fromEntries(
    Object.entries(params).map(([key, patchValue]) => [key, toRadarPatchInput(patchValue)]),
  )
}

function mapMetaPatch(meta: SourceRadarMetaPatchInput): SourceRadarMetaPatch {
  return Object.fromEntries(
    Object.entries(meta).map(([key, patchValue]) => [key, toRadarMetaPatchInput(patchValue)]),
  )
}

function toRadarValue(input: RadarValueInput): SourceRadarValue {
  return input instanceof RadarValueBuilder ? input.toRadarValue() : input
}

function toRadarPatchInput(input: RadarPatchInput): SourceRadarValue | SourceRadarPatchValue {
  return input instanceof RadarValueBuilder ? input.toRadarPatchValue() : input
}

function toRadarMetaPatchInput(input: SourceRadarMetaPatch[keyof SourceRadarMetaPatch] | RadarValueBuilder) {
  return input instanceof RadarValueBuilder ? input.toRadarPatchValue() : input
}
