import type { QueryClient } from "@tanstack/react-query"
import { createRootRouteWithContext, Outlet, useNavigate, useParams } from "@tanstack/react-router"
import { useAtomValue } from "jotai"
import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { TanStackDevtools } from "@/components/common/devtools"
import { ScrollProgressProvider } from "@/components/common/scroll-progress-provider"
import { Header } from "@/components/header"
import { ROOT_SCROLL_RESTORATION_ID } from "@/lib/scroll-restoration"
import { boardsAtom } from "@/store/board"
import { currentBoardIdAtom } from "@/store/settings"

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
})

function NotFoundComponent() {
  return <div>Not Found</div>
}

function RootComponent() {
  const boards = useAtomValue(boardsAtom)
  const currentBoardId = useAtomValue(currentBoardIdAtom)
  const navigate = useNavigate()
  const { boardId: routeBoardId } = useParams({ strict: false }) as { boardId?: string }
  const previousBoardIdRef = useRef(currentBoardId)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(null)
  const handleScrollContainerRef = useCallback((container: HTMLDivElement | null) => {
    scrollContainerRef.current = container
    setScrollContainer(container)
  }, [])

  useEffect(() => {
    const previousBoardId = previousBoardIdRef.current
    previousBoardIdRef.current = currentBoardId
    const targetBoard = boards.find(board => board.id === currentBoardId)
    if (
      previousBoardId === currentBoardId
      || routeBoardId === currentBoardId
      || !targetBoard
    ) {
      return
    }
    void navigate({
      to: "/board/$boardId",
      params: { boardId: currentBoardId },
      state: state => ({ ...state, layer: targetBoard.defaultLayer }),
    })
  }, [boards, currentBoardId, navigate, routeBoardId])

  return (
    <ScrollProgressProvider
      rootScrollContainer={scrollContainer}
      rootScrollContainerRef={scrollContainerRef}
    >
      <div
        ref={handleScrollContainerRef}
        data-scroll-restoration-id={ROOT_SCROLL_RESTORATION_ID}
        className="relative h-full min-h-0 w-full overflow-y-auto scrollbar-hidden"
      >
        <div className="flex min-h-full w-full flex-col">
          <Header />
          <main className="relative flex min-h-0 grow shrink-0 flex-col">
            <Outlet />
          </main>
        </div>
      </div>
      <Suspense>
        <TanStackDevtools />
      </Suspense>
    </ScrollProgressProvider>
  )
}
