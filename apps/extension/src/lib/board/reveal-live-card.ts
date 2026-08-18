export function revealLiveCard(id: string, attemptsRemaining = 20): void {
  const liveCard = document.querySelector<HTMLElement>(`[data-live-card-id="${CSS.escape(id)}"]`)
  if (liveCard) {
    liveCard.scrollIntoView({ behavior: "smooth", block: "center" })
    return
  }

  if (attemptsRemaining > 0) {
    window.setTimeout(revealLiveCard, 50, id, attemptsRemaining - 1)
  }
}
