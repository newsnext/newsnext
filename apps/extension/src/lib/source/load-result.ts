import type {
  SourceDescriptor,
  SourceLoaderResult,
} from "@newsnext/source-kit/types"

export type CachedSourceDescriptor = Pick<
  SourceDescriptor,
  "capabilities" | "id" | "metadata" | "params" | "provider" | "version"
>

export interface SourceLoadResult extends SourceLoaderResult {
  source: CachedSourceDescriptor
}
