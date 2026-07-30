import type {
  ProviderSourceConfig,
  SourceConfig,
  SourceConfigDefaults,
} from "../core/resolver"
import type { SourceLoader, SourceProvider } from "../types"

export interface ProviderConfig extends SourceProvider {
  defaults?: SourceConfigDefaults
  sources: Record<string, ProviderSourceConfig>
}

export type SourceRegistryConfig = Omit<SourceConfig, "loader"> & {
  loader?: SourceConfig["loader"]
  provider: SourceProvider
}

export type SourceRegistry = Record<string, SourceRegistryConfig>

export type ExecutableSourceLoaders = Record<string, SourceLoader>
