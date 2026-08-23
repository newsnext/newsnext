import type {
  SourceDescriptor,
  SourceLoaderResult,
} from "@newsnext/source-kit/types"

export type LoadedSourceDescriptor = Pick<
  SourceDescriptor,
  "capabilities" | "id" | "metadata" | "params" | "provider" | "version"
>

export interface SourceLoadResult extends SourceLoaderResult {
  source: LoadedSourceDescriptor
}

export interface SourceLoadResponse {
  fetchProtected: boolean
  fetchedAt: number
  loadedAt: number
  params: Record<string, unknown>
  result: SourceLoadResult
}
