import type { StreamStatus as NativeStreamStatus } from "@/lib/native-protocol/StreamStatus"

export function needsStreamAttention(stream: NativeStreamStatus): boolean {
  return stream.activity === "offline" || stream.activity === "backoff" || stream.policy.lastOutcome === "error"
}

export function sortStreams(streams: NativeStreamStatus[], attentionFirst = false): NativeStreamStatus[] {
  return [...streams].sort((a, b) => (attentionFirst ? Number(needsStreamAttention(b)) - Number(needsStreamAttention(a)) : 0)
    || a.sourceId.localeCompare(b.sourceId)
    || a.workerId.localeCompare(b.workerId)
    || a.streamId.localeCompare(b.streamId))
}

export function summarizeStreams(streams: NativeStreamStatus[]): { observations: number, unknownCounts: number, attention: number, waitingForData: number } {
  return streams.reduce((summary, stream) => {
    if (stream.observationCount == null) summary.unknownCounts++
    else summary.observations += stream.observationCount
    if (needsStreamAttention(stream)) summary.attention++
    if (stream.observationCount === 0 || !stream.resolved) summary.waitingForData++
    return summary
  }, { observations: 0, unknownCounts: 0, attention: 0, waitingForData: 0 })
}

export function collectionExplanation(stream: NativeStreamStatus): string {
  if (stream.activity === "offline") return "Collection is paused until the owning Worker reconnects."
  if (stream.activity === "backoff") return "The last attempt failed. Collection will retry at the scheduled time."
  if (stream.activity === "loading") return "Collecting now. A new retained result will add an observation."
  if (stream.policy.lastOutcome === "error") return "The last attempt failed; the stream is waiting to retry."
  if (stream.activity === "due") return "Ready to collect; waiting for an available execution slot."
  if (stream.policy.lastOutcome === "cached") return "The last attempt reused cached data. Replaying the same fetch adds no observation."
  if (stream.policy.phase === "burst") return "A recent content change keeps collection at the minimum interval."
  if (stream.policy.phase === "learning") return "Collecting initial samples to learn how often this stream changes."
  return "Collection timing adapts to observed content changes, within 1–60 minutes."
}
