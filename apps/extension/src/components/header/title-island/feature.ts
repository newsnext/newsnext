import type { ReactNode } from "react"

export const TITLE_ISLAND_FEATURE_PRIORITY = {
  panel: 100,
  notification: 200,
  interaction: 300,
} as const

export interface TitleIslandFeature {
  blockOutsideInteraction?: boolean
  content: ReactNode
  height: number
  id: string
  onDismiss?: () => void
  priority: number
  surfaceClassName?: string
  width: number
}

export function resolveTitleIslandFeature(
  features: readonly (TitleIslandFeature | null | undefined)[],
): TitleIslandFeature | null {
  let activeFeature: TitleIslandFeature | null = null

  for (const feature of features) {
    if (feature && (!activeFeature || feature.priority > activeFeature.priority)) {
      activeFeature = feature
    }
  }

  return activeFeature
}
