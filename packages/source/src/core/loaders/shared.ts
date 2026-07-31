import type {
  SourceLoaderMetadata,
  SourceTemplateVars,
} from "../../types"

export interface LoaderContext {
  vars?: SourceTemplateVars
  params?: Record<string, unknown>
}

export interface LoaderMetadataFields<TField> {
  badge?: TField
  desc?: TField
  title?: TField
}

export interface LoaderFields<TField> {
  title: TField
  url: TField
  mobileUrl?: TField
  timestamp?: TField
  inline?: {
    text?: TField
    html?: TField
    mark?: TField
    icon?: TField
  }
  preview?: {
    text?: TField
    html?: TField
    picture?: TField
    iframe?: TField
  }
}

export function normalizeLoaderMetadata(
  values: Record<string, unknown>,
): SourceLoaderMetadata | undefined {
  const metadata = Object.fromEntries(
    Object.entries(values).flatMap(([key, value]) => (
      value === undefined || value === null || value === ""
        ? []
        : [[key, String(value)]]
    )),
  ) as SourceLoaderMetadata

  return Object.keys(metadata).length > 0 ? metadata : undefined
}
