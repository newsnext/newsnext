import { useAtomValue } from "jotai"
import { useMemo } from "react"
import Card from "@/components/card"
import { getClientSourceDescriptors } from "@/lib/client-sources"
import { buildBoardSources } from "@/lib/source-cards"
import { boardInstancesAtom, boardStarIdsAtom } from "@/store/board"

const CLIENT_SOURCES = getClientSourceDescriptors()

export function StarredSidePanel() {
  const starredInstanceIds = useAtomValue(boardStarIdsAtom("stars"))
  const instances = useAtomValue(boardInstancesAtom("stars"))

  const { ids: sourceIds, map: sourcesMap } = useMemo(() => {
    return buildBoardSources({
      sources: CLIENT_SOURCES,
      boardId: "stars",
      starredSourceInstanceIds: starredInstanceIds,
      sourceInstances: instances,
      isLocalOnly: true,
    })
  }, [starredInstanceIds, instances])

  return (
    <main className="grid-texture-background h-screen overflow-y-auto bg-background px-3 py-4 text-foreground sprinkle-theme-400">
      {sourceIds.length === 0
        ? (
            <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 text-center text-sm text-muted-foreground">
              Star cards from any board to collect them here.
            </div>
          )
        : (
            <ol className="flex flex-col items-center gap-3 pb-4">
              {sourceIds.map(sourceId => (
                <li key={sourceId} className="w-full">
                  <Card
                    id={sourceId}
                    source={sourcesMap[sourceId]}
                    sizeClassName="h-[30rem] w-full max-w-[25rem]"
                  />
                </li>
              ))}
            </ol>
          )}
    </main>
  )
}
