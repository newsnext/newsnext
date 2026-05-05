import type {
  AdaptiveCacheAlgorithm,
  AdaptiveCacheMode,
  AdaptiveCacheState,
  EffectiveMaxCacheAgeOptions,
  UpdateAdaptiveCacheStateForErrorOptions,
  UpdateAdaptiveCacheStateOptions,
} from "./typings"

const ADAPTIVE_TOP_ITEM_COUNT = 10
const ADAPTIVE_EWMA_ALPHA = 0.3
const ADAPTIVE_HOTTEST_CHANGE_THRESHOLD = 0.2
const ADAPTIVE_TIMELINE_CHANGE_THRESHOLD = 0.01
const OPTIMIZER_CANDIDATE_MULTIPLIERS = [1, 2, 3, 5, 8, 13, 21, 30]

interface AlgorithmConfig {
  hottestDecreaseMultiplier: number
  unchangedIncreaseMultiplier: number
  unchangedIncreaseMode: "additive" | "multiplicative"
  quietMaxMultiplier: number
  errorBackoffBase: number
}

const algorithmConfigs: Record<AdaptiveCacheAlgorithm, AlgorithmConfig> = {
  balanced: {
    hottestDecreaseMultiplier: 0.7,
    unchangedIncreaseMultiplier: 1,
    unchangedIncreaseMode: "additive",
    quietMaxMultiplier: 4,
    errorBackoffBase: 2,
  },
  responsive: {
    hottestDecreaseMultiplier: 0.5,
    unchangedIncreaseMultiplier: 0.5,
    unchangedIncreaseMode: "additive",
    quietMaxMultiplier: 2,
    errorBackoffBase: 1.5,
  },
  economical: {
    hottestDecreaseMultiplier: 0.85,
    unchangedIncreaseMultiplier: 1.6,
    unchangedIncreaseMode: "multiplicative",
    quietMaxMultiplier: 6,
    errorBackoffBase: 2.5,
  },
  optimizer: {
    hottestDecreaseMultiplier: 0.6,
    unchangedIncreaseMultiplier: 1,
    unchangedIncreaseMode: "additive",
    quietMaxMultiplier: 3,
    errorBackoffBase: 2,
  },
}

export const adaptiveCacheAlgorithms = Object.keys(algorithmConfigs) as AdaptiveCacheAlgorithm[]

export function getBestAdaptiveCacheAlgorithm(mode: AdaptiveCacheMode): AdaptiveCacheAlgorithm {
  return mode === "timeline" ? "economical" : "optimizer"
}

function getAlgorithmConfig(algorithm: AdaptiveCacheAlgorithm | undefined): AlgorithmConfig {
  return algorithmConfigs[algorithm ?? "balanced"]
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function getIdentity(item: unknown): string {
  if (item && typeof item === "object") {
    const record = item as Record<string, unknown>
    const identity = record.id ?? record.url ?? record.link ?? record.title
    if (identity !== undefined && identity !== null) {
      return String(identity)
    }
  }

  return JSON.stringify(item) ?? String(item)
}

export function getTopIdentities(value: unknown, count = ADAPTIVE_TOP_ITEM_COUNT): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.slice(0, count).map(getIdentity)
}

export function getFingerprint(value: unknown, mode: AdaptiveCacheMode): string {
  const identities = getTopIdentities(value)
  if (mode === "timeline") {
    return identities.join("\n")
  }

  return identities.map((identity, index) => `${index}:${identity}`).join("\n")
}

export function getTimelineChangeScore(previous: unknown, next: unknown): number {
  const previousIdentities = new Set(getTopIdentities(previous))
  const nextIdentities = getTopIdentities(next)
  if (nextIdentities.length === 0) {
    return 0
  }

  const newLeadingItems = nextIdentities.filter(identity => !previousIdentities.has(identity)).length
  return newLeadingItems / nextIdentities.length
}

export function getHottestChangeScore(previous: unknown, next: unknown): number {
  const previousIdentities = getTopIdentities(previous)
  const nextIdentities = getTopIdentities(next)
  if (nextIdentities.length === 0) {
    return 0
  }

  const previousPositions = new Map(previousIdentities.map((identity, index) => [identity, index]))
  const maxMovement = Math.max(nextIdentities.length - 1, 1)
  const totalScore = nextIdentities.reduce((sum, identity, index) => {
    const previousIndex = previousPositions.get(identity)
    if (previousIndex === undefined) {
      return sum + 1
    }

    return sum + Math.abs(previousIndex - index) / maxMovement
  }, 0)

  return totalScore / nextIdentities.length
}

export function getChangeScore(previous: unknown, next: unknown, mode: AdaptiveCacheMode): number {
  if (previous === undefined) {
    return 1
  }

  return mode === "timeline"
    ? getTimelineChangeScore(previous, next)
    : getHottestChangeScore(previous, next)
}

export function getCurrentUtcHour(now: number): number {
  return new Date(now).getUTCHours()
}

export function getQuietMultiplier(state: AdaptiveCacheState | undefined, now: number): number {
  return getQuietMultiplierForAlgorithm(state, now, "balanced")
}

export function getQuietMultiplierForAlgorithm(
  state: AdaptiveCacheState | undefined,
  now: number,
  algorithm: AdaptiveCacheAlgorithm | undefined,
): number {
  if (!state) {
    return 1
  }

  const config = getAlgorithmConfig(algorithm)
  const hour = getCurrentUtcHour(now)
  const hourScore = state.hourlyChangeScores[hour] ?? state.averageChangeScore
  const activity = 0.7 * hourScore + 0.3 * state.averageChangeScore
  return clamp(1 / Math.max(activity, 0.25), 1, config.quietMaxMultiplier)
}

export function getEffectiveMaxCacheAge({
  state,
  now,
  minFetchAge,
  maxCacheAge,
  algorithm,
}: EffectiveMaxCacheAgeOptions): number {
  if (!state) {
    return minFetchAge
  }

  const quietMultiplier = getQuietMultiplierForAlgorithm(state, now, algorithm)
  return clamp(state.currentMaxCacheAge * quietMultiplier, minFetchAge, maxCacheAge)
}

function getUnchangedMaxCacheAge(
  currentMaxCacheAge: number,
  minFetchAge: number,
  maxCacheAge: number,
  config: AlgorithmConfig,
): number {
  if (config.unchangedIncreaseMode === "multiplicative") {
    return clamp(currentMaxCacheAge * config.unchangedIncreaseMultiplier, minFetchAge, maxCacheAge)
  }

  return clamp(currentMaxCacheAge + minFetchAge * config.unchangedIncreaseMultiplier, minFetchAge, maxCacheAge)
}

function getActivityScore(state: AdaptiveCacheState, now: number): number {
  const hour = getCurrentUtcHour(now)
  const hourScore = state.hourlyChangeScores[hour] ?? state.averageChangeScore
  return clamp(0.7 * hourScore + 0.3 * state.averageChangeScore, 0, 1)
}

function getOptimizerCandidateAges(minFetchAge: number, maxCacheAge: number): number[] {
  return Array.from(new Set(
    OPTIMIZER_CANDIDATE_MULTIPLIERS.map(multiplier => clamp(minFetchAge * multiplier, minFetchAge, maxCacheAge)),
  ))
}

function getOptimizedMaxCacheAge(
  state: AdaptiveCacheState,
  now: number,
  minFetchAge: number,
  maxCacheAge: number,
  mode: AdaptiveCacheMode,
): number {
  const activity = getActivityScore(state, now)
  const staleWeight = mode === "timeline" ? 0.62 : 0.72
  const fetchWeight = 1 - staleWeight
  const candidates = getOptimizerCandidateAges(minFetchAge, maxCacheAge)

  return candidates.reduce((bestAge, candidateAge) => {
    const bestScore = getOptimizerCost(bestAge, minFetchAge, maxCacheAge, activity, staleWeight, fetchWeight)
    const candidateScore = getOptimizerCost(candidateAge, minFetchAge, maxCacheAge, activity, staleWeight, fetchWeight)
    return candidateScore < bestScore ? candidateAge : bestAge
  }, minFetchAge)
}

function getOptimizerCost(
  candidateAge: number,
  minFetchAge: number,
  maxCacheAge: number,
  activity: number,
  staleWeight: number,
  fetchWeight: number,
): number {
  const fetchCost = minFetchAge / candidateAge
  const staleCost = activity * (candidateAge / maxCacheAge)
  return fetchWeight * fetchCost + staleWeight * staleCost
}

export function createInitialAdaptiveState(now: number, minFetchAge: number): AdaptiveCacheState {
  return {
    currentMaxCacheAge: minFetchAge,
    lastFetchedAt: now,
    unchangedStreak: 0,
    errorStreak: 0,
    hourlyChangeScores: Array.from({ length: 24 }, () => 0.5),
    averageChangeScore: 0.5,
  }
}

export function updateHourlyChangeScores(state: AdaptiveCacheState, now: number, changeScore: number): number[] {
  const hour = getCurrentUtcHour(now)
  const scores = Array.from({ length: 24 }, (_, index) => state.hourlyChangeScores[index] ?? state.averageChangeScore)
  scores[hour] = ADAPTIVE_EWMA_ALPHA * changeScore + (1 - ADAPTIVE_EWMA_ALPHA) * scores[hour]
  return scores
}

export function updateAdaptiveCacheState({
  previous,
  next,
  state,
  now,
  minFetchAge,
  maxCacheAge,
  mode,
  algorithm,
}: UpdateAdaptiveCacheStateOptions): AdaptiveCacheState {
  const currentState = state ?? createInitialAdaptiveState(now, minFetchAge)
  const config = getAlgorithmConfig(algorithm)
  const changeScore = getChangeScore(previous, next, mode)
  const changed = mode === "timeline"
    ? changeScore >= ADAPTIVE_TIMELINE_CHANGE_THRESHOLD
    : changeScore >= ADAPTIVE_HOTTEST_CHANGE_THRESHOLD
  const averageChangeScore = ADAPTIVE_EWMA_ALPHA * changeScore + (1 - ADAPTIVE_EWMA_ALPHA) * currentState.averageChangeScore
  const hourlyChangeScores = updateHourlyChangeScores(currentState, now, changeScore)
  const measuredState = {
    ...currentState,
    hourlyChangeScores,
    averageChangeScore,
  }
  const currentMaxCacheAge = algorithm === "optimizer"
    ? changed && mode === "timeline"
      ? minFetchAge
      : getOptimizedMaxCacheAge(measuredState, now, minFetchAge, maxCacheAge, mode)
    : changed
      ? mode === "timeline"
        ? minFetchAge
        : clamp(currentState.currentMaxCacheAge * config.hottestDecreaseMultiplier, minFetchAge, maxCacheAge)
      : getUnchangedMaxCacheAge(currentState.currentMaxCacheAge, minFetchAge, maxCacheAge, config)

  return {
    currentMaxCacheAge,
    lastFingerprint: getFingerprint(next, mode),
    lastFetchedAt: now,
    lastChangedAt: changed ? now : currentState.lastChangedAt,
    unchangedStreak: changed ? 0 : currentState.unchangedStreak + 1,
    errorStreak: 0,
    hourlyChangeScores,
    averageChangeScore,
  }
}

export function updateAdaptiveCacheStateForError({
  state,
  now,
  minFetchAge,
  maxCacheAge,
  algorithm,
}: UpdateAdaptiveCacheStateForErrorOptions): AdaptiveCacheState {
  const currentState = state ?? createInitialAdaptiveState(now, minFetchAge)
  const config = getAlgorithmConfig(algorithm)
  const errorStreak = currentState.errorStreak + 1

  return {
    ...currentState,
    currentMaxCacheAge: clamp(minFetchAge * config.errorBackoffBase ** errorStreak, minFetchAge, maxCacheAge),
    lastFetchedAt: now,
    errorStreak,
  }
}
