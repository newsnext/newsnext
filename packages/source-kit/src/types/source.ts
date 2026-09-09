import type { InferSourceParams, SourceDescriptor, SourceLoaderOutput, SourceLoaderResult, SourceParamSchemaMap, SourceSecrets } from "@newsnext/sdk/models"
import type { KyInstance } from "ky"

export type { CategoryId, SourceCapabilities, SourceCookieSecretDefinition, SourceDescriptor, SourceLoaderOutput, SourceLoaderResult, SourceLocalStorageSecretDefinition, SourcePatch, SourcePresentationMetadata, SourcePresentationType, SourceProvider, SourceRadarMatch, SourceRadarMetadata, SourceRadarParam, SourceRadarParams, SourceRadarParamScript, SourceRadarPatch, SourceRadarPaths, SourceRadarRule, SourceRequestRule, SourceSecretBaseDefinition, SourceSecretDefinition, SourceSecrets, SourceTemplateVars, SourceTemplateVarValue } from "@newsnext/sdk/models"
export { CATEGORY_IDS, isSourcePresentationMetadataKey, isSourcePresentationType, SOURCE_PRESENTATION_METADATA_KEYS, SOURCE_PRESENTATION_TYPES } from "@newsnext/sdk/models"

export type SourceFetch = KyInstance

export interface SourceLoaderContext {
  fetch: SourceFetch
  secrets?: SourceSecrets
  signal: AbortSignal
  updateSecrets?: (secrets: SourceSecrets) => Promise<void>
}

export type SourceLoaderDefinition<TParams extends SourceParamSchemaMap = SourceParamSchemaMap> = (
  params: InferSourceParams<TParams>,
  context: SourceLoaderContext,
) => Promise<SourceLoaderOutput>

export type SourceLoader<TParams extends SourceParamSchemaMap = SourceParamSchemaMap> = (
  params: InferSourceParams<TParams>,
  context: SourceLoaderContext,
) => Promise<SourceLoaderResult>

export interface RuntimeSource<TParams extends SourceParamSchemaMap = SourceParamSchemaMap> extends Omit<SourceDescriptor<TParams>, "id"> {
  loader: SourceLoader<TParams>
}
export interface ProviderDefinition {
  sources: Record<string, RuntimeSource<any>>
}
