import type {
  ProviderSourceConfig,
  SourceConfig,
  SourceConfigDefaults,
} from "../core/resolver"
import type { SourceProvider } from "../types"

export interface ProviderConfig {
  title: string
  defaults?: SourceConfigDefaults
  sources: Record<string, ProviderSourceConfig>
}

export type SourceRegistryConfig = SourceConfig & {
  provider: SourceProvider
}

export type SourceRegistry = Record<string, SourceRegistryConfig>
