import type { CSSProperties, ReactNode } from "react"
import type { BackgroundActionRecord } from "@/lib/background/action-dispatcher"
import type { BackgroundDiagnosticsSnapshot } from "@/lib/background/diagnostics-service"
import { useCallback, useEffect, useRef, useState } from "react"
import { browser } from "#imports"
import { createBackgroundClient } from "@/lib/background"
import { isBackgroundDiagnosticsChangedMessage } from "@/lib/background/diagnostics-events"

type PanelId = "overview" | "actions" | "application"
type DevtoolsTheme = "dark" | "light"

const PANEL_LABELS: Record<PanelId, string> = {
  overview: "Overview",
  actions: "Activity",
  application: "Application",
}

const colors = {
  accent: "var(--nn-devtools-accent)",
  amber: "var(--nn-devtools-warning)",
  border: "var(--nn-devtools-border)",
  canvas: "var(--nn-devtools-canvas)",
  error: "var(--nn-devtools-error)",
  errorBorder: "var(--nn-devtools-error-border)",
  errorSurface: "var(--nn-devtools-error-surface)",
  errorText: "var(--nn-devtools-error-text)",
  green: "var(--nn-devtools-success)",
  ink: "var(--nn-devtools-ink)",
  muted: "var(--nn-devtools-muted)",
  panel: "var(--nn-devtools-panel)",
  secondaryInk: "var(--nn-devtools-secondary-ink)",
  selected: "var(--nn-devtools-selected)",
  tag: "var(--nn-devtools-tag)",
} as const

const themeStyles: Record<DevtoolsTheme, CSSProperties> = {
  dark: {
    "--nn-devtools-accent": "#9cd5e2",
    "--nn-devtools-border": "#2d2d2d",
    "--nn-devtools-canvas": "#111111",
    "--nn-devtools-error": "#edaa8d",
    "--nn-devtools-error-border": "#e06e49",
    "--nn-devtools-error-surface": "#5f1a06",
    "--nn-devtools-error-text": "#edaa8d",
    "--nn-devtools-ink": "#ffffff",
    "--nn-devtools-muted": "#aea691",
    "--nn-devtools-panel": "#1f1f1f",
    "--nn-devtools-secondary-ink": "#c5c3bf",
    "--nn-devtools-selected": "#ffffff14",
    "--nn-devtools-success": "#a2e1a9",
    "--nn-devtools-tag": "#2b2b2b",
    "--nn-devtools-warning": "#fae884",
    "colorScheme": "dark",
  } as CSSProperties,
  light: {
    "--nn-devtools-accent": "#003e53",
    "--nn-devtools-border": "#eeebd4",
    "--nn-devtools-canvas": "#ffffff",
    "--nn-devtools-error": "#5f1a06",
    "--nn-devtools-error-border": "#5f1a06",
    "--nn-devtools-error-surface": "#f9d8c4",
    "--nn-devtools-error-text": "#5f1a06",
    "--nn-devtools-ink": "#111111",
    "--nn-devtools-muted": "#756c5b",
    "--nn-devtools-panel": "#fafafa",
    "--nn-devtools-secondary-ink": "#3e3529",
    "--nn-devtools-selected": "#1111110f",
    "--nn-devtools-success": "#1d4226",
    "--nn-devtools-tag": "#eeebd4",
    "--nn-devtools-warning": "#624a00",
    "colorScheme": "light",
  } as CSSProperties,
}

const styles = createStyles()
const diagnostics = createBackgroundClient().diagnostics

export function BackgroundDevtoolsPanel({ devtoolsOpen, theme }: { devtoolsOpen: boolean, theme: DevtoolsTheme }): React.JSX.Element {
  const [activePanel, setActivePanel] = useState<PanelId>("overview")
  const [error, setError] = useState<string>()
  const [filter, setFilter] = useState("")
  const [snapshot, setSnapshot] = useState<BackgroundDiagnosticsSnapshot>()
  const refreshQueuedRef = useRef(false)
  const refreshPromiseRef = useRef<Promise<void> | undefined>(undefined)

  const refresh = useCallback((): Promise<void> => {
    refreshQueuedRef.current = true
    refreshPromiseRef.current ??= (async () => {
      while (refreshQueuedRef.current) {
        refreshQueuedRef.current = false
        try {
          setSnapshot(await diagnostics.getSnapshot())
          setError(undefined)
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : String(reason))
        }
      }
    })().finally(() => {
      refreshPromiseRef.current = undefined
    })
    return refreshPromiseRef.current
  }, [])

  useEffect(() => {
    if (!devtoolsOpen) return
    const handleMessage = (message: unknown): void => {
      if (isBackgroundDiagnosticsChangedMessage(message)) void refresh()
    }
    browser.runtime.onMessage.addListener(handleMessage)
    const initialRefresh = setTimeout(refresh, 0)
    return () => {
      browser.runtime.onMessage.removeListener(handleMessage)
      clearTimeout(initialRefresh)
    }
  }, [devtoolsOpen, refresh])

  const counts: Record<PanelId, number | undefined> = {
    overview: undefined,
    actions: snapshot?.actions.length,
    application: snapshot
      ? snapshot.application.collections.length + snapshot.application.instances.length + 2
      : undefined,
  }

  return (
    <div style={{ ...styles.root, ...themeStyles[theme] }}>
      <header style={styles.toolbar}>
        <div style={styles.brand}>
          <StatusDot active={!error && snapshot !== undefined} />
          <strong>Background</strong>
          {!snapshot && <span style={styles.mutedText}>connecting</span>}
        </div>
        <div style={styles.toolbarActions}>
          <input
            aria-label="Filter current view"
            placeholder={`Filter ${PANEL_LABELS[activePanel].toLowerCase()}…`}
            style={styles.search}
            type="search"
            value={filter}
            onChange={event => setFilter(event.target.value)}
          />
          {activePanel === "actions" && (
            <button
              type="button"
              style={styles.dangerButton}
              onClick={() => void diagnostics.clearActions()}
            >
              Clear activity
            </button>
          )}
        </div>
      </header>

      <nav aria-label="Background diagnostics" style={styles.navigation}>
        {(Object.entries(PANEL_LABELS) as Array<[PanelId, string]>).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-current={activePanel === id ? "page" : undefined}
            style={activePanel === id ? styles.activeTab : styles.tab}
            onClick={() => {
              setActivePanel(id)
              setFilter("")
            }}
          >
            {label}
            {counts[id] !== undefined && <span style={styles.count}>{counts[id]}</span>}
          </button>
        ))}
      </nav>

      <main style={styles.content}>
        {error && <ErrorBanner message={`Background snapshot failed: ${error}`} />}
        {!snapshot && !error && <CenteredMessage>Waiting for the extension background…</CenteredMessage>}
        {snapshot && activePanel === "overview" && <Overview snapshot={snapshot} filter={filter} />}
        {snapshot && activePanel === "actions" && <ActionsPanel snapshot={snapshot} filter={filter} />}
        {snapshot && activePanel === "application" && <ApplicationPanel snapshot={snapshot} filter={filter} />}
      </main>
    </div>
  )
}

interface PanelProps {
  filter: string
  snapshot: BackgroundDiagnosticsSnapshot
}

function Overview({ filter, snapshot }: PanelProps): React.JSX.Element {
  const stats = [
    ["Activity", snapshot.actions.length],
    ["Collections", snapshot.application.collections.length],
    ["Instances", snapshot.application.instances.length],
  ] as const
  return (
    <div style={styles.overview}>
      <div style={styles.statStrip}>
        {stats.map(([label, value]) => (
          <div key={label} style={styles.stat}>
            <span style={styles.statLabel}>{label}</span>
            <strong style={styles.statValue}>{value}</strong>
          </div>
        ))}
      </div>
      <div style={styles.overviewGrid}>
        <InspectorSection title="Recent activity" count={snapshot.actions.length}>
          <ActionTable actions={filterActions(snapshot.actions.slice(0, 10), filter)} />
        </InspectorSection>
      </div>
    </div>
  )
}

function ActionsPanel({ filter, snapshot }: PanelProps): React.JSX.Element {
  const actions = filterActions(snapshot.actions, filter)
  const [selectedId, setSelectedId] = useState<string>()
  const selected = actions.find(action => action.id === selectedId) ?? actions[0]
  return (
    <MasterDetail
      empty={actions.length === 0}
      footer="Newest first · retained for this worker lifetime"
      list={actions.map(action => (
        <ListButton key={action.id} active={action.id === selected?.id} onClick={() => setSelectedId(action.id)}>
          <span style={styles.actionTitle}>
            <ActionStatus status={action.status} />
            <span style={styles.rowTitle}>{action.name}</span>
            <span style={styles.origin}>{action.origin}</span>
          </span>
          <span style={styles.rowMeta}>{`${formatTime(action.startedAt)} · ${formatDuration(action)}`}</span>
        </ListButton>
      ))}
    >
      {selected && <ActionDetail action={selected} />}
    </MasterDetail>
  )
}

function ActionDetail({ action }: { action: BackgroundActionRecord }): React.JSX.Element {
  return (
    <div style={styles.detailScroll}>
      <DetailHeader
        title={action.name}
        eyebrow={action.id}
        trailing={<ActionStatus status={action.status} label />}
      />
      <DefinitionGrid>
        <Definition label="Origin" value={action.origin} />
        <Definition label="Started" value={formatDateTime(action.startedAt)} />
        <Definition label="Duration" value={formatDuration(action)} />
        <Definition label="Command ID" value={action.commandId ?? "—"} />
      </DefinitionGrid>
      {action.error && <div style={styles.actionError}>{action.error}</div>}
      <Subheading>Input</Subheading>
      <JsonBlock value={action.input} compact />
      <Subheading>Result</Subheading>
      <JsonBlock value={action.result ?? null} compact />
    </div>
  )
}

function ApplicationPanel({ filter, snapshot }: PanelProps): React.JSX.Element {
  const application = snapshot.application
  const entries = [
    ...application.collections.map(value => ({ id: `collection:${value.id}`, kind: "Collection", label: value.name || value.id, value })),
    ...application.instances.map(value => ({ id: `instance:${value.instanceId}`, kind: "Instance", label: value.patch.metadata?.title || value.instanceId, value })),
    { id: "settings", kind: "State", label: "Settings", value: snapshot.settings },
    { id: "device", kind: "State", label: "Device state", value: snapshot.deviceState },
  ].filter(entry => matches(filter, entry.kind, entry.label, entry.id))
  const [selectedId, setSelectedId] = useState<string>()
  const selected = entries.find(entry => entry.id === selectedId) ?? entries[0]
  return (
    <MasterDetail
      empty={entries.length === 0}
      list={entries.map(entry => (
        <ListButton key={entry.id} active={entry.id === selected?.id} onClick={() => setSelectedId(entry.id)}>
          <span style={styles.rowTitle}>{entry.label}</span>
          <span style={styles.rowMeta}>{entry.kind}</span>
        </ListButton>
      ))}
    >
      {selected && <DetailDocument title={selected.label} eyebrow={selected.id} value={selected.value} />}
    </MasterDetail>
  )
}

function MasterDetail({ children, empty, footer, list }: { children: ReactNode, empty: boolean, footer?: string, list: ReactNode }): React.JSX.Element {
  return (
    <div style={styles.masterDetail}>
      <aside style={styles.master}>
        <div style={styles.masterScroll}>{empty ? <CenteredMessage>No matching entries.</CenteredMessage> : list}</div>
        {footer && <div style={styles.masterFooter}>{footer}</div>}
      </aside>
      <section style={styles.detail}>{empty ? <CenteredMessage>Select or create an entry to inspect it.</CenteredMessage> : children}</section>
    </div>
  )
}

function ListButton({ active, children, onClick }: { active: boolean, children: ReactNode, onClick: () => void }): React.JSX.Element {
  return <button type="button" style={active ? styles.activeListButton : styles.listButton} onClick={onClick}>{children}</button>
}

function DetailDocument({ eyebrow, title, value }: { eyebrow: string, title: string, value: unknown }): React.JSX.Element {
  return (
    <div style={styles.detailDocument}>
      <DetailHeader title={title} eyebrow={eyebrow} />
      <JsonBlock value={value} />
    </div>
  )
}

function DetailHeader({ eyebrow, title, trailing }: { eyebrow: string, title: string, trailing?: ReactNode }): React.JSX.Element {
  return (
    <header style={styles.detailHeader}>
      <div style={styles.detailHeading}>
        <span style={styles.detailEyebrow}>{eyebrow}</span>
        <h2 style={styles.detailTitle}>{title}</h2>
      </div>
      {trailing}
    </header>
  )
}

function InspectorSection({ children, count, title }: { children: ReactNode, count: number, title: string }): React.JSX.Element {
  return (
    <section style={styles.inspectorSection}>
      <div style={styles.sectionTitle}>
        <span>{title}</span>
        <span style={styles.count}>{count}</span>
      </div>
      <div style={styles.sectionBody}>{children}</div>
    </section>
  )
}

function ActionTable({ actions }: { actions: BackgroundActionRecord[] }): React.JSX.Element {
  if (actions.length === 0) return <CenteredMessage>No matching activity.</CenteredMessage>
  return (
    <div style={styles.actionTable}>
      {actions.map(action => (
        <div key={action.id} style={styles.actionTableRow}>
          <ActionStatus status={action.status} />
          <code style={styles.actionName}>{action.name}</code>
          <span style={styles.origin}>{action.origin}</span>
          <time style={styles.monoMuted}>{formatTime(action.startedAt)}</time>
          <code style={styles.duration}>{formatDuration(action)}</code>
        </div>
      ))}
    </div>
  )
}

function ActionStatus({ label = false, status }: { label?: boolean, status: BackgroundActionRecord["status"] }): React.JSX.Element {
  const color = status === "success" ? colors.green : status === "error" ? colors.error : colors.amber
  return (
    <span style={{ ...styles.actionStatus, color }}>
      <span style={{ ...styles.statusDot, background: color }} />
      {label && status}
    </span>
  )
}

function DefinitionGrid({ children }: { children: ReactNode }): React.JSX.Element {
  return <dl style={styles.definitionGrid}>{children}</dl>
}

function Definition({ label, value }: { label: string, value: ReactNode }): React.JSX.Element {
  return (
    <div style={styles.definition}>
      <dt style={styles.definitionLabel}>{label}</dt>
      <dd style={styles.definitionValue}>{value}</dd>
    </div>
  )
}

function Subheading({ children }: { children: ReactNode }): React.JSX.Element {
  return <h3 style={styles.subheading}>{children}</h3>
}

function JsonBlock({ compact = false, value }: { compact?: boolean, value: unknown }): React.JSX.Element {
  return <pre style={compact ? styles.compactJson : styles.json}>{JSON.stringify(value, null, 2)}</pre>
}

function StatusDot({ active }: { active: boolean }): React.JSX.Element {
  return <span aria-label={active ? "Connected" : "Idle"} style={{ ...styles.statusDot, background: active ? colors.green : colors.error }} />
}

function ErrorBanner({ message }: { message: string }): React.JSX.Element {
  return <div style={styles.errorBanner}>{message}</div>
}

function CenteredMessage({ children }: { children: ReactNode }): React.JSX.Element {
  return <div style={styles.centeredMessage}>{children}</div>
}

function filterActions(actions: BackgroundActionRecord[], filter: string): BackgroundActionRecord[] {
  return actions.filter(action => matches(filter, action.name, action.origin, action.status, action.commandId, action.error))
}

function matches(filter: string, ...values: unknown[]): boolean {
  const needle = filter.trim().toLowerCase()
  return !needle || values.some(value => String(value ?? "").toLowerCase().includes(needle))
}

function formatDuration(action: BackgroundActionRecord): string {
  return action.status === "running" ? "running" : `${action.durationMs ?? 0} ms`
}

function formatTime(value: number): string {
  return new Date(value).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

function formatDateTime(value: number): string {
  return new Date(value).toLocaleString()
}

function createStyles(): Record<string, CSSProperties> {
  const listButton: CSSProperties = { alignItems: "stretch", background: "transparent", border: 0, borderBottom: `1px solid ${colors.border}`, color: colors.ink, cursor: "pointer", display: "flex", flexDirection: "column", gap: 3, padding: "9px 12px", textAlign: "left", width: "100%" }
  return {
    root: { background: colors.canvas, color: colors.ink, display: "grid", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", fontSize: 12, gridTemplateRows: "40px 34px minmax(0, 1fr)", height: "100%", minHeight: 320, overflow: "hidden" },
    toolbar: { alignItems: "center", background: colors.panel, borderBottom: `1px solid ${colors.border}`, display: "flex", gap: 20, justifyContent: "space-between", padding: "0 10px" },
    brand: { alignItems: "center", display: "flex", gap: 8, minWidth: 0, whiteSpace: "nowrap" },
    mutedText: { color: colors.muted, fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 10 },
    toolbarActions: { alignItems: "center", display: "flex", gap: 6, minWidth: 0 },
    search: { background: colors.canvas, border: `1px solid ${colors.border}`, borderRadius: 4, color: colors.ink, fontFamily: "inherit", fontSize: 11, height: 26, minWidth: 140, outline: "none", padding: "0 8px", width: "min(28vw, 260px)" },
    dangerButton: { background: colors.panel, border: `1px solid ${colors.errorBorder}`, borderRadius: 4, color: colors.errorText, cursor: "pointer", fontSize: 11, height: 26, padding: "0 9px" },
    navigation: { alignItems: "stretch", background: colors.panel, borderBottom: `1px solid ${colors.border}`, display: "flex", overflowX: "auto", padding: "0 6px" },
    tab: { alignItems: "center", background: "transparent", border: 0, borderBottom: "2px solid transparent", color: colors.muted, cursor: "pointer", display: "inline-flex", fontSize: 11, gap: 6, padding: "0 10px", whiteSpace: "nowrap" },
    activeTab: { alignItems: "center", background: "transparent", border: 0, borderBottom: `2px solid ${colors.accent}`, color: colors.ink, cursor: "pointer", display: "inline-flex", fontSize: 11, fontWeight: 600, gap: 6, padding: "0 10px", whiteSpace: "nowrap" },
    count: { background: colors.tag, borderRadius: 8, color: colors.muted, fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 9, lineHeight: "16px", minWidth: 16, padding: "0 4px", textAlign: "center" },
    content: { minHeight: 0, overflow: "hidden", position: "relative" },
    overview: { display: "grid", gridTemplateRows: "44px minmax(0, 1fr)", height: "100%", minHeight: 0 },
    statStrip: { alignItems: "stretch", background: colors.panel, borderBottom: `1px solid ${colors.border}`, display: "flex", overflowX: "auto" },
    stat: { alignItems: "center", borderRight: `1px solid ${colors.border}`, display: "flex", gap: 12, minWidth: 118, padding: "0 12px" },
    statLabel: { color: colors.muted, fontSize: 10, whiteSpace: "nowrap" },
    statValue: { fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 14 },
    overviewGrid: { minHeight: 0, overflow: "auto" },
    inspectorSection: { background: colors.panel, minHeight: 140, minWidth: 0 },
    sectionTitle: { alignItems: "center", borderBottom: `1px solid ${colors.border}`, display: "flex", fontSize: 11, fontWeight: 600, gap: 7, height: 32, padding: "0 10px" },
    sectionBody: { maxHeight: 300, overflow: "auto" },
    masterDetail: { display: "grid", gridTemplateColumns: "minmax(240px, 32%) minmax(0, 1fr)", height: "100%", minHeight: 0 },
    master: { background: colors.panel, borderRight: `1px solid ${colors.border}`, display: "grid", gridTemplateRows: "minmax(0, 1fr) auto", minHeight: 0 },
    masterScroll: { minHeight: 0, overflow: "auto" },
    masterFooter: { borderTop: `1px solid ${colors.border}`, color: colors.muted, fontSize: 9, padding: "7px 10px" },
    detail: { background: colors.canvas, minHeight: 0, minWidth: 0, overflow: "hidden" },
    listButton,
    activeListButton: { ...listButton, background: colors.selected, boxShadow: `inset 2px 0 ${colors.accent}` },
    rowTitle: { fontSize: 11, fontWeight: 600, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    rowMeta: { color: colors.muted, fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 9, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    actionTitle: { alignItems: "center", display: "grid", gap: 7, gridTemplateColumns: "8px minmax(0, 1fr) auto" },
    origin: { background: colors.tag, borderRadius: 3, color: colors.muted, fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 8, padding: "2px 4px", textTransform: "uppercase" },
    detailDocument: { display: "grid", gridTemplateRows: "auto minmax(0, 1fr)", height: "100%", minHeight: 0 },
    detailScroll: { height: "100%", minHeight: 0, overflow: "auto" },
    detailHeader: { alignItems: "center", borderBottom: `1px solid ${colors.border}`, display: "flex", gap: 12, justifyContent: "space-between", padding: "12px 16px" },
    detailHeading: { minWidth: 0 },
    detailEyebrow: { color: colors.muted, display: "block", fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 9, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    detailTitle: { fontSize: 14, fontWeight: 600, margin: 0 },
    json: { background: colors.canvas, color: colors.secondaryInk, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 10, lineHeight: 1.55, margin: 0, overflow: "auto", padding: 16, tabSize: 2, whiteSpace: "pre-wrap", wordBreak: "break-word" },
    compactJson: { background: colors.canvas, color: colors.secondaryInk, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 10, lineHeight: 1.55, margin: 0, maxHeight: 260, overflow: "auto", padding: "12px 16px", tabSize: 2, whiteSpace: "pre-wrap", wordBreak: "break-word" },
    definitionGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", margin: 0, padding: "10px 16px" },
    definition: { borderBottom: `1px solid ${colors.border}`, minWidth: 0, padding: "7px 8px 7px 0" },
    definitionLabel: { color: colors.muted, fontSize: 9, marginBottom: 3, textTransform: "uppercase" },
    definitionValue: { fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 10, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
    subheading: { background: colors.panel, borderBottom: `1px solid ${colors.border}`, borderTop: `1px solid ${colors.border}`, fontSize: 10, fontWeight: 600, margin: "8px 0 0", padding: "7px 16px", textTransform: "uppercase" },
    actionError: { background: colors.errorSurface, borderBottom: `1px solid ${colors.errorBorder}`, color: colors.errorText, fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 10, padding: "8px 16px" },
    actionStatus: { alignItems: "center", display: "inline-flex", fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 9, gap: 6, textTransform: "uppercase" },
    actionTable: { minWidth: 500 },
    actionTableRow: { alignItems: "center", borderBottom: `1px solid ${colors.border}`, display: "grid", gap: 10, gridTemplateColumns: "8px minmax(180px, 1fr) 70px 90px 70px", minHeight: 30, padding: "0 10px" },
    actionName: { color: colors.ink, fontSize: 10 },
    duration: { color: colors.amber, fontSize: 9, textAlign: "right" },
    monoMuted: { color: colors.muted, fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 9 },
    centeredMessage: { alignItems: "center", color: colors.muted, display: "flex", fontSize: 11, height: "100%", justifyContent: "center", minHeight: 80, padding: 16, textAlign: "center" },
    errorBanner: { background: colors.errorSurface, borderBottom: `1px solid ${colors.errorBorder}`, color: colors.errorText, fontSize: 10, left: 0, padding: "7px 10px", position: "absolute", right: 0, top: 0, zIndex: 2 },
    statusDot: { borderRadius: 8, display: "inline-block", flex: "0 0 auto", height: 7, width: 7 },
  } satisfies Record<string, CSSProperties>
}
