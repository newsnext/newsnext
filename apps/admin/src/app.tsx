import type { SourceParamSchema } from "@newsnext/sources/typings"
import type { CSSProperties, ReactNode } from "react"
import type { FilterState, SourceDraft, SourceStats, StatusTone } from "./lib/source-admin"
import { Button } from "@newsnext/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@newsnext/ui/components/card"
import { SidebarInset, SidebarProvider } from "@newsnext/ui/components/sidebar"
import { useEffect, useMemo, useState } from "react"
import { authClient, signInWithGitHub, signInWithGoogle } from "./auth"
import { AppSidebar } from "./components/app-sidebar"
import { ChartAreaInteractive } from "./components/chart-area-interactive"
import { DataTable } from "./components/data-table"
import { SectionCards } from "./components/section-cards"
import { SiteHeader } from "./components/site-header"
import { SourceEditor } from "./components/source-editor"
import { createDraft } from "./lib/source-admin"
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
            <CardDescription>Sign in to inspect code-defined sources.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button type="button" onClick={() => void signInWithGitHub()}>GitHub</Button>
            <Button type="button" variant="outline" onClick={() => void signInWithGoogle()}>Google</Button>
          </CardContent>
        </Card>
      </CenteredShell>
    )
  }

  return <SourceAdmin userName={session.user.name || session.user.email} />
}

function SourceAdmin({ userName }: { userName: string }) {
  const utils = trpc.useUtils()
  const { data: sources = [], isPending, isError, error } = trpc.getAdminSources.useQuery(undefined, {
    retry: false,
  })
  const [selectedKey, setSelectedKey] = useState("")
  const [draft, setDraft] = useState<SourceDraft | undefined>()
  const [status, setStatus] = useState<{ tone: StatusTone, message: string } | undefined>()
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("all")
  const [filterState, setFilterState] = useState<FilterState>("all")

  const updateSource = trpc.updateAdminSource.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.getAdminSources.invalidate(),
        utils.getBoard.invalidate(),
      ])
      setStatus({ tone: "success", message: "Saved" })
    },
    onError: err => setStatus({ tone: "error", message: err.message }),
  })

  const selectedSource = useMemo(
    () => sources.find(source => source.key === selectedKey) ?? sources[0],
    [sources, selectedKey],
  )

  const filteredSources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return sources.filter((source) => {
      const matchesQuery = !normalizedQuery || [
        source.key,
        source.name,
        source.title,
        source.provider,
        source.sourceId,
      ].filter(Boolean).some(value => String(value).toLowerCase().includes(normalizedQuery))
      const matchesCategory = category === "all" || source.category === category
      const matchesState = filterState === "all"
        || (filterState === "enabled" && source.enabled)
        || (filterState === "disabled" && !source.enabled)

      return matchesQuery && matchesCategory && matchesState
    })
  }, [category, sources, filterState, query])

  const stats = useMemo<SourceStats>(() => ({
    total: sources.length,
    enabled: sources.filter(source => source.enabled).length,
    disabled: sources.filter(source => !source.enabled).length,
    providers: new Set(sources.map(source => source.provider)).size,
    categories: new Set(sources.map(source => source.category)).size,
  }), [sources])

  const isDirty = Boolean(selectedSource && draft && JSON.stringify(draft) !== JSON.stringify(createDraft(selectedSource)))

  useEffect(() => {
    if (selectedSource && !selectedKey) {
      setSelectedKey(selectedSource.key)
    }
  }, [selectedSource, selectedKey])

  useEffect(() => {
    if (selectedSource) {
      setDraft(createDraft(selectedSource))
      setStatus(undefined)
    }
  }, [selectedSource])

  function updateDraft(key: keyof SourceDraft, value: string | boolean): void {
    setDraft(prev => prev ? { ...prev, [key]: value } : prev)
  }

  function resetDraft(): void {
    if (selectedSource) {
      setDraft(createDraft(selectedSource))
      setStatus(undefined)
    }
  }

  function handleSave(): void {
    if (!selectedSource || !draft) {
      return
    }

    let params: Record<string, SourceParamSchema>
    try {
      params = JSON.parse(draft.paramsText) as Record<string, SourceParamSchema>
    } catch {
      setStatus({ tone: "error", message: "Params must be valid JSON" })
      return
    }

    setStatus({ tone: "muted", message: "Saving..." })
    updateSource.mutate({
      key: selectedSource.key,
      name: draft.name,
      title: draft.title,
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
    return <CenteredShell>Loading sources...</CenteredShell>
  }

  if (isError) {
    return <CenteredShell>{error.message}</CenteredShell>
  }

  if (!selectedSource || !draft) {
    return <CenteredShell>No sources found.</CenteredShell>
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
          selectedSource={selectedSource}
          isDirty={isDirty}
          saving={updateSource.isPending}
          onReset={resetDraft}
          onSave={handleSave}
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards stats={stats} />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive sources={sources} />
              </div>
              <div className="grid gap-4 px-4 lg:px-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(32rem,0.95fr)]">
                <DataTable sources={filteredSources} selectedKey={selectedSource.key} onSelect={setSelectedKey} />
                <SourceEditor
                  sourceKey={selectedSource.key}
                  provider={selectedSource.provider}
                  updatedAt={selectedSource.updatedAt}
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
