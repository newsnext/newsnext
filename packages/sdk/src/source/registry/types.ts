import type { SourceProvider } from "../../models/index.js"
import type {
  ProviderSourceConfig,
  SourceConfigDefaults,
} from "../core/resolver"

export interface ProviderConfig extends SourceProvider {
  defaults?: SourceConfigDefaults
  sources: Record<string, ProviderSourceConfig>
}
