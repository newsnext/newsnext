import type { SourceInstance } from "@/lib/source"
import type { SourceDescriptor } from "@/typings/source"
import { Button } from "@newsnext/ui/components/button"
import { useAtomValue, useSetAtom } from "jotai"
import { useCallback, useEffect, useMemo, useState } from "react"
import { browser } from "#imports"
import { ConfigSection } from "@/components/common/config-section"
import { PhCheckCircle } from "@/components/icons/ph"
import { useKeyedAsyncAction } from "@/hooks/use-async-action"
import { useSourceDescriptors } from "@/hooks/use-source-descriptors"
import {
  getGrantedHostPermissionOrigins,
  getPermissionOriginLabel,
  getPermissionRequestForSource,
  getUserManagedHostPermissionOrigins,
  revokeHostPermissionOrigin,
} from "@/lib/source"
import { deleteInstanceAtom, instancesAtom } from "@/store/board"

interface PermissionLiveCard {
  id: string
  title: string
}

interface ArmedRevokeAction {
  origin: string
  removeCards: boolean
}

const PERMISSION_ACTION_CLASS = "pointer-events-none shrink-0 opacity-0 transition-[opacity,color,background-color,border-color] duration-300 ease-out group-hover/permission:pointer-events-auto group-hover/permission:opacity-100 group-focus-within/permission:pointer-events-auto group-focus-within/permission:opacity-100 motion-reduce:transition-none"

function grantedOriginIncludes(grantedOrigin: string, requestedOrigin: string): boolean {
  return grantedOrigin === requestedOrigin || grantedOrigin === "*://*/*"
}

function getLiveCardsUsingOrigin(
  origin: string,
  sources: SourceDescriptor[],
  instances: SourceInstance[],
): PermissionLiveCard[] {
  const sourcesById = new Map(sources.map(source => [source.id, source]))

  return instances.flatMap((instance) => {
    const source = sourcesById.get(instance.sourceId)
    if (!source) return []

    const request = getPermissionRequestForSource({
      capabilities: source.capabilities,
      params: source.params,
      provider: source.provider,
      sourceId: source.id,
    }, instance.patch.params)
    const usesOrigin = request?.origins?.some(requestedOrigin => (
      grantedOriginIncludes(origin, requestedOrigin)
    ))
    if (!usesOrigin) return []

    return [{
      id: instance.instanceId,
      title: instance.patch.metadata?.title
        ?? source.metadata.title
        ?? source.provider.title,
    }]
  })
}

export function PermissionsSettings({
  onOpenLiveCard,
}: {
  onOpenLiveCard: (id: string) => Promise<void> | void
}) {
  const [origins, setOrigins] = useState<string[]>([])
  const [armedAction, setArmedAction] = useState<ArmedRevokeAction>()
  const instances = useAtomValue(instancesAtom)
  const deleteInstance = useSetAtom(deleteInstanceAtom)
  const { isLoading: areSourcesLoading, sources } = useSourceDescriptors()
  const {
    error: revokeError,
    isPending: isRevoking,
    resetError: resetRevokeError,
    run: runRevoke,
  } = useKeyedAsyncAction<string>("NewsNext could not revoke this permission.")

  const cardsByOrigin = useMemo(() => new Map(origins.map(origin => [
    origin,
    getLiveCardsUsingOrigin(origin, sources, instances),
  ])), [instances, origins, sources])

  const refreshOrigins = useCallback(async (): Promise<void> => {
    const grantedOrigins = await getGrantedHostPermissionOrigins()
    setOrigins(getUserManagedHostPermissionOrigins(grantedOrigins, import.meta.env.DEV))
  }, [])

  useEffect(() => {
    const handlePermissionChange = (): void => {
      void refreshOrigins()
    }

    void refreshOrigins()
    browser.permissions.onAdded.addListener(handlePermissionChange)
    browser.permissions.onRemoved.addListener(handlePermissionChange)

    return () => {
      browser.permissions.onAdded.removeListener(handlePermissionChange)
      browser.permissions.onRemoved.removeListener(handlePermissionChange)
    }
  }, [refreshOrigins])

  const handleRevokeOrigin = useCallback(async (
    origin: string,
    removeCards: boolean,
  ): Promise<void> => {
    const cards = cardsByOrigin.get(origin) ?? []
    const succeeded = await runRevoke(origin, async () => {
      const revoked = await revokeHostPermissionOrigin(origin)
      if (!revoked) {
        throw new Error("NewsNext could not revoke this site access.")
      }
      if (removeCards) {
        for (const card of cards) {
          await deleteInstance(card.id)
        }
      }
      await refreshOrigins()
    }, removeCards
      ? "NewsNext could not revoke this site access and remove its LiveCards."
      : "NewsNext could not revoke this site access.")

    if (succeeded) setArmedAction(undefined)
  }, [cardsByOrigin, deleteInstance, refreshOrigins, runRevoke])

  const handleRevokeClick = useCallback((origin: string, removeCards: boolean): void => {
    if (armedAction?.origin === origin && armedAction.removeCards === removeCards) {
      void handleRevokeOrigin(origin, removeCards)
      return
    }
    resetRevokeError()
    setArmedAction({ origin, removeCards })
  }, [armedAction, handleRevokeOrigin, resetRevokeError])

  return (
    <>
      <ConfigSection
        title="Site access"
        description="NewsNext requests access when a source needs a site. See which LiveCards depend on each permission before revoking it."
        surfaceClassName="p-0"
      >
        {origins.length === 0
          ? (
              <p className="p-4 text-sm text-muted-foreground">
                No site access has been granted.
              </p>
            )
          : (
              <ul className="divide-y divide-border/50">
                {origins.map((origin) => {
                  const cards = cardsByOrigin.get(origin) ?? []
                  const isOriginRevoking = isRevoking(origin)
                  const isRevokeArmed = armedAction?.origin === origin && !armedAction.removeCards
                  const isRemoveArmed = armedAction?.origin === origin && armedAction.removeCards
                  return (
                    <li key={origin} className="group/permission px-4 py-3">
                      <div className="flex min-w-0 items-center justify-between gap-4">
                        <div className="min-w-0 flex-1 truncate text-sm font-medium">{getPermissionOriginLabel(origin)}</div>
                        {!areSourcesLoading && (
                          <Button
                            variant={isRevokeArmed ? "destructive" : "outline"}
                            size="xs"
                            className={PERMISSION_ACTION_CLASS}
                            disabled={isOriginRevoking}
                            onBlur={() => setArmedAction(undefined)}
                            onClick={() => handleRevokeClick(origin, false)}
                          >
                            {isRevokeArmed && <PhCheckCircle />}
                            <span aria-live="polite">
                              {isOriginRevoking && !armedAction?.removeCards
                                ? "Revoking..."
                                : isRevokeArmed ? "Confirm Revoke" : "Revoke"}
                            </span>
                          </Button>
                        )}
                      </div>
                      {areSourcesLoading
                        ? (
                            <div className="mt-2 text-xs text-muted-foreground">
                              Checking LiveCards…
                            </div>
                          )
                        : cards.length > 0 && (
                          <div className="mt-1.5 flex min-w-0 items-center justify-between gap-4">
                            <div className="flex min-w-0 flex-1 items-center text-xs">
                              <ul className="flex min-w-0 flex-wrap gap-x-2 gap-y-0.5">
                                {cards.map(card => (
                                  <li key={card.id} className="min-w-0">
                                    <Button
                                      variant="link"
                                      size="icon-fit"
                                      className="max-w-full justify-start whitespace-normal text-left text-xs font-normal text-foreground"
                                      title={`Go to ${card.title}`}
                                      onClick={() => void onOpenLiveCard(card.id)}
                                    >
                                      {card.title}
                                    </Button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <Button
                              variant={isRemoveArmed ? "destructive" : "outline"}
                              size="xs"
                              className={PERMISSION_ACTION_CLASS}
                              disabled={isOriginRevoking}
                              onBlur={() => setArmedAction(undefined)}
                              onClick={() => handleRevokeClick(origin, true)}
                            >
                              {isRemoveArmed && <PhCheckCircle />}
                              <span aria-live="polite">
                                {isOriginRevoking && armedAction?.removeCards
                                  ? "Removing..."
                                  : isRemoveArmed ? "Confirm Remove Cards" : "Revoke and Remove Cards"}
                              </span>
                            </Button>
                          </div>
                        )}
                    </li>
                  )
                })}
              </ul>
            )}
      </ConfigSection>
      {revokeError && (
        <p role="alert" className="mt-6 text-sm text-destructive">{revokeError}</p>
      )}
    </>
  )
}
