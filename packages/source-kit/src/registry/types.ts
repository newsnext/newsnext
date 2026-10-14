import type {
  ProviderSourceConfig,
  SourceConfigDefaults,
} from "../core/resolver"
import type { SourceProvider } from "../types"

export interface ProviderConfig extends SourceProvider {
  defaults?: SourceConfigDefaults
  sources: Record<string, ProviderSourceConfig>
}
