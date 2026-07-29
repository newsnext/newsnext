import type {
  ProviderSourceConfig,
  SourceConfig,
  SourceConfigDefaults,
} from "../core/resolver"
import type { CategoryId, SourceLoader, SourceProvider } from "../types"

export interface ProviderConfig {
  title: string
  category?: CategoryId
  defaults?: SourceConfigDefaults
  sources: Record<string, ProviderSourceConfig>
}

export type SourceRegistryConfig = Omit<SourceConfig, "loader"> & {
  loader?: SourceConfig["loader"]
  provider: SourceProvider
}

export type SourceRegistry = Record<string, SourceRegistryConfig>

export type ExecutableSourceLoaders = Record<string, SourceLoader>
