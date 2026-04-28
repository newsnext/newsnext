import type { FeedParamSchema } from "@newsnext/feeds/typings"
import type { CSSProperties, ReactNode } from "react"
import type { FeedDraft, FeedStats, FilterState, StatusTone } from "./lib/feed-admin"
import { Button } from "@newsnext/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@newsnext/ui/components/card"
import { SidebarInset, SidebarProvider } from "@newsnext/ui/components/sidebar"
import { useEffect, useMemo, useState } from "react"
import { authClient, signInWithGitHub, signInWithGoogle } from "./auth"
import { AppSidebar } from "./components/app-sidebar"
import { ChartAreaInteractive } from "./components/chart-area-interactive"
import { DataTable } from "./components/data-table"
import { FeedEditor } from "./components/feed-editor"
import { SectionCards } from "./components/section-cards"
import { SiteHeader } from "./components/site-header"
import { createDraft } from "./lib/feed-admin"
import { trpc } from "./trpc"

export function App() {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return <CenteredShell>Loading session...</CenteredShell>
  }

  if (!session) {
    return (
      <CenteredShell>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>NewsNext Admin</CardTitle>
            <CardDescription>Sign in to manage database-backed feeds.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button type="button" onClick={() => void signInWithGitHub()}>GitHub</Button>
            <Button type="button" variant="outline" onClick={() => void signInWithGoogle()}>Google</Button>
          </CardContent>
        </Card>
      </CenteredShell>
    )
  }

  return <FeedAdmin userName={session.user.name || session.user.email} />
}

function FeedAdmin({ userName }: { userName: string }) {
  const utils = trpc.useUtils()
  const { data: feeds = [], isPending, isError, error } = trpc.getAdminFeeds.useQuery(undefined, {
    retry: false,
  })
  const [selectedKey, setSelectedKey] = useState("")
  const [draft, setDraft] = useState<FeedDraft | undefined>()
  const [status, setStatus] = useState<{ tone: StatusTone, message: string } | undefined>()
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("all")
  const [filterState, setFilterState] = useState<FilterState>("all")

  const updateFeed = trpc.updateAdminFeed.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.getAdminFeeds.invalidate(),
        utils.getBoard.invalidate(),
      ])
      setStatus({ tone: "success", message: "Saved" })
    },
    onError: err => setStatus({ tone: "error", message: err.message }),
  })

  const selectedFeed = useMemo(
    () => feeds.find(feed => feed.key === selectedKey) ?? feeds[0],
    [feeds, selectedKey],
  )

  const filteredFeeds = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return feeds.filter((feed) => {
      const matchesQuery = !normalizedQuery || [
        feed.key,
        feed.name,
        feed.title,
        feed.provider,
        feed.feedId,
      ].filter(Boolean).some(value => String(value).toLowerCase().includes(normalizedQuery))
      const matchesCategory = category === "all" || feed.category === category
      const matchesState = filterState === "all"
        || (filterState === "enabled" && feed.enabled)
        || (filterState === "disabled" && !feed.enabled)

      return matchesQuery && matchesCategory && matchesState
    })
  }, [category, feeds, filterState, query])

  const stats = useMemo<FeedStats>(() => ({
    total: feeds.length,
    enabled: feeds.filter(feed => feed.enabled).length,
    disabled: feeds.filter(feed => !feed.enabled).length,
    providers: new Set(feeds.map(feed => feed.provider)).size,
    categories: new Set(feeds.map(feed => feed.category)).size,
  }), [feeds])

  const isDirty = Boolean(selectedFeed && draft && JSON.stringify(draft) !== JSON.stringify(createDraft(selectedFeed)))

  useEffect(() => {
    if (selectedFeed && !selectedKey) {
      setSelectedKey(selectedFeed.key)
    }
  }, [selectedFeed, selectedKey])

  useEffect(() => {
    if (selectedFeed) {
      setDraft(createDraft(selectedFeed))
      setStatus(undefined)
    }
  }, [selectedFeed])

  function updateDraft(key: keyof FeedDraft, value: string | boolean): void {
    setDraft(prev => prev ? { ...prev, [key]: value } : prev)
  }

  function resetDraft(): void {
    if (selectedFeed) {
      setDraft(createDraft(selectedFeed))
      setStatus(undefined)
    }
  }

  function handleSave(): void {
    if (!selectedFeed || !draft) {
      return
    }

    let params: Record<string, FeedParamSchema>
    try {
      params = JSON.parse(draft.paramsText) as Record<string, FeedParamSchema>
    } catch {
      setStatus({ tone: "error", message: "Params must be valid JSON" })
      return
    }

    const interval = Number(draft.interval)
    if (!Number.isFinite(interval) || interval < 1) {
      setStatus({ tone: "error", message: "Interval must be a positive number" })
      return
    }

    setStatus({ tone: "muted", message: "Saving..." })
    updateFeed.mutate({
      key: selectedFeed.key,
      name: draft.name,
      title: draft.title,
      interval,
      params,
      color: draft.color,
      desc: draft.desc,
      type: draft.type || undefined,
      category: draft.category,
      home: draft.home,
      icon: draft.icon,
      enabled: draft.enabled,
    })
  }

  if (isPending) {
    return <CenteredShell>Loading feeds...</CenteredShell>
  }

  if (isError) {
    return <CenteredShell>{error.message}</CenteredShell>
  }

  if (!selectedFeed || !draft) {
    return <CenteredShell>No feeds found.</CenteredShell>
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as CSSProperties
      }
    >
      <AppSidebar
        variant="inset"
        stats={stats}
        query={query}
        category={category}
        filterState={filterState}
        onQueryChange={setQuery}
        onCategoryChange={setCategory}
        onFilterStateChange={setFilterState}
      />
      <SidebarInset>
        <SiteHeader
          userName={userName}
          selectedFeed={selectedFeed}
          isDirty={isDirty}
          saving={updateFeed.isPending}
          onReset={resetDraft}
          onSave={handleSave}
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards stats={stats} />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive feeds={feeds} />
              </div>
              <div className="grid gap-4 px-4 lg:px-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(32rem,0.95fr)]">
                <DataTable feeds={filteredFeeds} selectedKey={selectedFeed.key} onSelect={setSelectedKey} />
                <FeedEditor
                  feedKey={selectedFeed.key}
                  provider={selectedFeed.provider}
                  updatedAt={selectedFeed.updatedAt}
                  draft={draft}
                  isDirty={isDirty}
                  status={status}
                  onDraftChange={updateDraft}
                />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function CenteredShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
      {children}
    </div>
  )
}
