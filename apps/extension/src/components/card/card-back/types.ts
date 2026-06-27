import type { Color } from "@newsnext/shared/types"

export interface SourceEditDraft {
  providerTitle: string
  title?: string
  desc?: string
  home?: string
  color: Color
}
