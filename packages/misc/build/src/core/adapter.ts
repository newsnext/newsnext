import type { ResolvedConfig, UserConfig } from "vite"
import type { EntryContentHook } from "../entry"

export interface Adapter {
  name: string

  /**
   * Hooks to inject code into the entry file
   */
  entryContentBeforeHooks?: EntryContentHook[]
  entryContentAfterHooks?: EntryContentHook[]
  entryContentDefaultExportHook?: EntryContentHook

  /**
   * Override output configuration
   */
  output?: string
  outputDir?: string

  /**
   * Vite specific hooks
   */
  vite?: {
    config?: (config: UserConfig) => UserConfig | Promise<UserConfig>
    configResolved?: (config: ResolvedConfig) => void
  }

  /**
   * General hooks
   */
  onWriteBundle?: (outDir: string, root: string) => Promise<void> | void
}
