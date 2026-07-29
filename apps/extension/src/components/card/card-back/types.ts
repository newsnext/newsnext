import type { Color } from "@newsnext/shared/types"
import type { SourceInstanceMetadata } from "@/lib/source-cards"

export type SourceEditDraft = SourceInstanceMetadata & {
  color: Color
}
