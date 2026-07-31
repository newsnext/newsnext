import type {
  SourcePresentationMetadata,
  SourceTemplateVars,
} from "../../types"

export interface LoaderContext {
  vars?: SourceTemplateVars
  params?: Record<string, unknown>
}

export type LoaderMetadataFields<TField> = {
  [K in keyof SourcePresentationMetadata]?: TField
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
): SourcePresentationMetadata | undefined {
  const metadata = Object.fromEntries(
    Object.entries(values).flatMap(([key, value]) => (
      value === undefined || value === null || value === ""
        ? []
        : [[key, String(value)]]
    )),
  ) as SourcePresentationMetadata

  return Object.keys(metadata).length > 0 ? metadata : undefined
}
