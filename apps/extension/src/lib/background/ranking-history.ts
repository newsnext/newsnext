export interface RankingPosition {
  observedAt: number
  position: number | null
}

export interface RankingHistoryData {
  positions: RankingPosition[]
  queriedAt: number
}

export interface RankingHistorySource {
  cardId: string
  sourceVersion: number
  params: Record<string, unknown>
}

export interface RankingHistoryQuery extends RankingHistorySource {
  url: string
}
