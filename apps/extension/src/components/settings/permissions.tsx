import type { SourceInstance } from "@/lib/source"
import type { SourceDescriptor } from "@/typings/source"
import { Button } from "@newsnext/ui/components/button"
import { useAtomValue, useSetAtom } from "jotai"
import { useCallback, useEffect, useMemo, useState } from "react"
import { browser } from "#imports"
import { ConfigSection } from "@/components/common/config-section"
import { ConfirmDestructiveButton } from "@/components/common/confirm-destructive-button"
import { useKeyedAsyncAction } from "@/hooks/use-async-action"
import { useSourceDescriptors } from "@/hooks/use-source-descriptors"
import {
  getGrantedHostPermissionOrigins,
  getPermissionOriginLabel,
  getPermissionRequestForSource,
  getUserManagedHostPermissionOrigins,
  revokeHostPermissionOrigin,
} from "@/lib/source"
import { collectionEntriesAtom, deleteInstanceAtom, instancesAtom } from "@/store/board"

interface PermissionLiveCard {
  id: string
  title: string
}

const PERMISSION_ACTION_CLASS = "pointer-events-none shrink-0 opacity-0 group-hover/permission:pointer-events-auto group-hover/permission:opacity-100 group-focus-within/permission:pointer-events-auto group-focus-within/permission:opacity-100"
const REVOKE_SITE_ACCESS_ERROR = "NewsNext could not revoke this site access."

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
  onOpenLiveCard: (id: string, boardId: string) => Promise<void> | void
}) {
  const [origins, setOrigins] = useState<string[]>([])
  const instances = useAtomValue(instancesAtom)
  const collectionEntries = useAtomValue(collectionEntriesAtom)
  const deleteInstance = useSetAtom(deleteInstanceAtom)
  const { isLoading: areSourcesLoading, sources } = useSourceDescriptors()
  const {
    error: revokeError,
    isPending: isRevoking,
    resetError: resetRevokeError,
    run: runRevoke,
  } = useKeyedAsyncAction<string>(REVOKE_SITE_ACCESS_ERROR)

  const cardsByOrigin = useMemo(() => new Map(origins.map(origin => [
    origin,
    getLiveCardsUsingOrigin(origin, sources, instances),
  ])), [instances, origins, sources])
  const boardIdByInstanceId = useMemo(() => new Map(
    collectionEntries.map(entry => [entry.instanceId, entry.collectionId]),
  ), [collectionEntries])

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
    await runRevoke(origin, async () => {
      const revoked = await revokeHostPermissionOrigin(origin)
      if (!revoked) {
        throw new Error(REVOKE_SITE_ACCESS_ERROR)
      }
      if (removeCards) {
        for (const card of cards) {
          await deleteInstance(card.id)
        }
      }
      await refreshOrigins()
    })
  }, [cardsByOrigin, deleteInstance, refreshOrigins, runRevoke])

  return (
    <>
      <ConfigSection
        title="Site access"
        description="See which sites NewsNext can access and the LiveCards that depend on them."
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
                  return (
                    <li key={origin} className="group/permission px-4 py-3">
                      <div className="flex min-w-0 items-center justify-between gap-4">
                        <div className="min-w-0 flex-1 truncate text-sm font-medium">{getPermissionOriginLabel(origin)}</div>
                        {!areSourcesLoading && (
                          <ConfirmDestructiveButton
                            type="button"
                            size="xs"
                            className={PERMISSION_ACTION_CLASS}
                            label="Revoke"
                            confirmLabel="Confirm revoke"
                            pending={isOriginRevoking}
                            pendingLabel="Revoking…"
                            onArm={resetRevokeError}
                            onConfirm={() => handleRevokeOrigin(origin, false)}
                          />
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
                                {cards.map((card) => {
                                  const boardId = boardIdByInstanceId.get(card.id)
                                  if (!boardId) return null
                                  return (
                                    <li key={card.id} className="min-w-0">
                                      <Button
                                        variant="link"
                                        size="icon-fit"
                                        className="max-w-full justify-start whitespace-normal text-left text-xs font-normal text-foreground"
                                        title={`Go to ${card.title}`}
                                        onClick={() => void onOpenLiveCard(card.id, boardId)}
                                      >
                                        {card.title}
                                      </Button>
                                    </li>
                                  )
                                })}
                              </ul>
                            </div>
                            <ConfirmDestructiveButton
                              type="button"
                              size="xs"
                              className={PERMISSION_ACTION_CLASS}
                              label="Revoke and remove LiveCards"
                              confirmLabel="Confirm revoke and remove"
                              pending={isOriginRevoking}
                              pendingLabel="Removing…"
                              onArm={resetRevokeError}
                              onConfirm={() => handleRevokeOrigin(origin, true)}
                            />
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
