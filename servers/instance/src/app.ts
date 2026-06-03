import type {
  InstanceDebugInfo,
  InstanceErrorResponse,
  InstanceSuccessResponse,
  LoadInstanceSourceOptions,
  NewsNextDataInstance,
  SourceCachePolicyInfo,
} from "./types"
import { SourceServiceError } from "./errors"

export interface LoadSourceBody extends Pick<LoadInstanceSourceOptions, "latest" | "paramsAreNormalized"> {
  params?: Record<string, unknown>
}

export function createInstanceStats(): RequestStats {
  return createRequestStats()
}

export function recordInstanceRequest(stats: RequestStats): void {
  stats.requestCount += 1
}

export async function renderInstanceHome(instance: NewsNextDataInstance, stats: RequestStats): Promise<Response> {
  const sources = await instance.listSourceDescriptors()
  const debugInfo = await collectDebugInfo(instance, sources, stats)

  return new Response(renderHomePage(debugInfo), {
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  })
}

export async function getInstanceDebug(instance: NewsNextDataInstance, stats: RequestStats) {
  const sources = await instance.listSourceDescriptors()
  return success(await collectDebugInfo(instance, sources, stats))
}

export async function listInstanceSources(instance: NewsNextDataInstance) {
  return success(await instance.listSourceDescriptors())
}

export async function loadInstanceSource(
  instance: NewsNextDataInstance,
  stats: RequestStats,
  sourceId: string,
  body: LoadSourceBody,
): Promise<Response> {
  recordHotSource(stats, sourceId)

  try {
    const result = await instance.loadSource({
      sourceId,
      params: body.params ?? {},
      latest: body.latest,
      paramsAreNormalized: body.paramsAreNormalized,
    })

    stats.sourceLoadCount += 1
    if (result.status === "cache") {
      stats.cacheResultCount += 1
    }

    return jsonResponse(success(result))
  } catch (error) {
    stats.sourceErrorCount += 1
    if (error instanceof SourceServiceError) {
      const status = error.code === "PROVIDER_NOT_FOUND" || error.code === "SOURCE_NOT_FOUND"
        ? 404
        : 400
      return jsonResponse(failure(error.code, error.message), status)
    }

    const err = error as Error
    console.error(`Error loading source ${sourceId}:`, err)
    return jsonResponse(failure("INTERNAL_ERROR", err.message || "Internal Server Error"), 500)
  }
}

export interface RequestStats {
  startedAt: number
  requestCount: number
  sourceLoadCount: number
  sourceErrorCount: number
  cacheResultCount: number
  hotSources: Map<string, number>
}

interface HomePageOptions extends InstanceDebugInfo {
  sourceCount: number
  providerCount: number
  categoryCount: number
  startedAt: string
  uptime: string
  requestCount: number
  requestFrequency: string
  sourceLoadCount: number
  sourceErrorCount: number
  cacheResultRatio: string
  categories: Array<{ name: string, count: number }>
  providers: Array<{ name: string, count: number }>
  hotSources: Array<{ sourceId: string, count: number }>
  sourcePolicies: SourceCachePolicyInfo[]
  generatedAt: string
}

function renderHomePage(options: HomePageOptions): string {
  const providerRows = renderCountRows(options.providers)
  const categoryRows = renderCountRows(options.categories)
  const hotSourceRows = options.hotSources.length > 0
    ? options.hotSources.map(item => `<li><span>${item.count}</span> <code>${escapeHtml(item.sourceId)}</code></li>`).join("")
    : `<li><span>0</span> No source requests yet</li>`
  const sourcePolicyRows = renderSourcePolicyRows(options.sourcePolicies)

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>NewsNext Instance</title>
    <style>
      :root {
        color-scheme: light dark;
        --background: #f5f5f5;
        --foreground: #171717;
        --surface: rgba(250, 250, 250, 0.72);
        --surface-strong: rgba(255, 255, 255, 0.64);
        --pill: rgba(0, 0, 0, 0.08);
        --muted: #525252;
        --subtle: #737373;
        --border: rgba(23, 23, 23, 0.10);
        --border-strong: rgba(23, 23, 23, 0.16);
        --theme: #ef4444;
        --theme-strong: #dc2626;
        --ok: #16a34a;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: var(--background);
        color: var(--foreground);
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        background-image: radial-gradient(ellipse 80% 80% at 50% -30%, rgba(248, 113, 113, 0.12), transparent 62%);
        background-repeat: no-repeat;
        background-size: 100% 100%;
      }

      main {
        width: min(1080px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 26px 0 56px;
      }

      .page-head {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
        align-items: center;
        gap: 12px;
        min-height: 44px;
        margin-bottom: 22px;
      }

      .brand-island {
        display: inline-flex;
        grid-column: 2;
        align-items: center;
        justify-content: center;
        gap: 9px;
        height: 40px;
        min-width: 150px;
        padding: 0 16px;
        border-radius: 999px;
        background: var(--pill);
        color: var(--foreground);
        box-shadow: 0 1px 2px rgba(23, 23, 23, 0.06);
        backdrop-filter: blur(18px);
      }

      .head-meta {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        min-width: 0;
      }

      .chip {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        height: 32px;
        padding: 0 12px;
        border: 1px solid var(--border);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.42);
        color: var(--muted);
        font-size: 0.8125rem;
        font-weight: 750;
        white-space: nowrap;
      }

      .brand-mark {
        width: 20px;
        height: 20px;
        flex: 0 0 auto;
        color: var(--theme);
      }

      .brand-name {
        margin: 0;
        font-family: "Baloo 2", Inter, ui-sans-serif, system-ui, sans-serif;
        font-size: 1.25rem;
        font-weight: 800;
        line-height: 1;
        letter-spacing: 0;
        white-space: nowrap;
      }

      .brand-accent {
        color: var(--theme);
      }

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--ok);
        box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.12);
      }

      .workspace {
        overflow: hidden;
        border: 1px solid var(--border);
        border-radius: 28px;
        background: var(--surface);
        backdrop-filter: blur(18px);
      }

      .workspace-head {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(260px, 420px);
        gap: 24px;
        align-items: end;
        padding: 28px 30px 24px;
      }

      .eyebrow,
      .label {
        margin: 0;
        color: var(--subtle);
        font-size: 0.75rem;
        font-weight: 800;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      .title {
        margin: 6px 0 0;
        font-family: "Baloo 2", Inter, ui-sans-serif, system-ui, sans-serif;
        font-size: 2.4rem;
        font-weight: 850;
        line-height: 1;
        letter-spacing: 0;
      }

      .summary {
        margin: 0;
        color: var(--muted);
        font-size: 0.95rem;
        line-height: 1.6;
      }

      .metrics {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        border-top: 1px solid var(--border);
        border-bottom: 1px solid var(--border);
        background: rgba(255, 255, 255, 0.24);
      }

      .metric {
        min-width: 0;
        padding: 15px 18px;
        border-right: 1px solid var(--border);
      }

      .metric:last-child {
        border-right: 0;
      }

      .metric-value {
        margin: 0;
        overflow-wrap: anywhere;
        color: var(--foreground);
        font-size: 1.42rem;
        font-weight: 850;
        line-height: 1.05;
      }

      .metric-label {
        margin: 7px 0 0;
        color: var(--subtle);
        font-size: 0.78rem;
        font-weight: 700;
      }

      .content {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 360px;
        border-bottom: 1px solid var(--border);
      }

      .section {
        min-width: 0;
        padding: 22px 30px;
      }

      .section + .section {
        border-left: 1px solid var(--border);
      }

      .section-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 14px;
      }

      .mono {
        margin: 0;
        color: var(--theme-strong);
        font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
        font-size: 0.82rem;
        font-weight: 800;
        overflow-wrap: anywhere;
      }

      .rows {
        display: grid;
        border: 1px solid var(--border);
        border-radius: 16px;
        overflow: hidden;
      }

      .row {
        display: grid;
        grid-template-columns: 104px minmax(0, 1fr);
        align-items: center;
        gap: 16px;
        min-height: 40px;
        padding: 0 14px;
        border-bottom: 1px solid var(--border);
        background: rgba(255, 255, 255, 0.28);
      }

      .row:last-child {
        border-bottom: 0;
      }

      .row span:first-child {
        color: var(--subtle);
        font-size: 0.75rem;
        font-weight: 800;
        text-transform: uppercase;
      }

      code {
        min-width: 0;
        color: var(--foreground);
        font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
        font-size: 0.875rem;
        overflow-wrap: anywhere;
      }

      .method {
        color: var(--theme-strong);
      }

      .lists {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .list {
        min-width: 0;
        padding: 20px 30px 24px;
      }

      .list + .list {
        border-left: 1px solid var(--border);
      }

      ol {
        display: grid;
        gap: 8px;
        margin: 13px 0 0;
        padding: 0;
        list-style: none;
      }

      li {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        min-width: 0;
        color: var(--muted);
        font-size: 0.9rem;
        line-height: 1.45;
      }

      li span {
        color: var(--foreground);
        font-weight: 850;
      }

      li code {
        min-width: 0;
        color: var(--muted);
        font-size: 0.84rem;
      }

      .source-policies {
        padding: 22px 30px 28px;
        border-top: 1px solid var(--border);
      }

      .policy-grid {
        display: grid;
        grid-template-columns: minmax(180px, 1.5fr) minmax(120px, 0.8fr) minmax(104px, 0.6fr) minmax(112px, 0.7fr);
        gap: 0;
        margin-top: 14px;
        border: 1px solid var(--border);
        border-radius: 16px;
        overflow: hidden;
      }

      .policy-row {
        display: contents;
      }

      .policy-cell {
        min-width: 0;
        padding: 10px 12px;
        border-bottom: 1px solid var(--border);
        color: var(--muted);
        font-size: 0.84rem;
        line-height: 1.35;
        overflow-wrap: anywhere;
      }

      .policy-row:last-child .policy-cell {
        border-bottom: 0;
      }

      .policy-cell + .policy-cell {
        border-left: 1px solid var(--border);
      }

      .policy-source {
        color: var(--foreground);
        font-weight: 800;
      }

      .policy-age {
        color: var(--theme-strong);
        font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
        font-weight: 800;
      }

      @media (max-width: 840px) {
        main {
          width: min(100vw - 24px, 1080px);
          padding-top: 18px;
        }

        .page-head {
          grid-template-columns: 1fr;
          justify-items: center;
        }

        .brand-island {
          grid-column: 1;
        }

        .head-meta {
          justify-content: center;
          flex-wrap: wrap;
        }

        .workspace-head,
        .content,
        .lists,
        .metrics {
          grid-template-columns: 1fr;
        }

        .workspace-head,
        .section,
        .list,
        .source-policies {
          padding-right: 18px;
          padding-left: 18px;
        }

        .policy-grid {
          grid-template-columns: minmax(0, 1fr);
        }

        .policy-cell {
          border-left: 0;
        }

        .policy-cell + .policy-cell {
          border-left: 0;
        }

        .metric,
        .section + .section,
        .list + .list {
          border-top: 1px solid var(--border);
          border-left: 0;
          border-right: 0;
        }

        .metric:first-child {
          border-top: 0;
        }
      }

      @media (prefers-color-scheme: dark) {
        :root {
          --background: #171717;
          --foreground: #d4d4d4;
          --surface: rgba(38, 38, 38, 0.72);
          --surface-strong: rgba(255, 255, 255, 0.06);
          --pill: rgba(255, 255, 255, 0.10);
          --muted: #a3a3a3;
          --subtle: #737373;
          --border: rgba(255, 255, 255, 0.10);
          --border-strong: rgba(255, 255, 255, 0.16);
        }

        .chip,
        .metrics,
        .row {
          background: rgba(255, 255, 255, 0.045);
        }
      }
    </style>
  </head>
  <body>
    <main>
      <header class="page-head">
        <div></div>
        <div class="brand-island">
          ${renderLogoSvg()}
          <p class="brand-name">News<span class="brand-accent">N</span>ext</p>
        </div>
        <div class="head-meta">
          <span class="chip"><span class="status-dot"></span> Online</span>
          <span class="chip">${escapeHtml(options.mode)}</span>
        </div>
      </header>

      <section class="workspace" aria-label="Instance status">
        <div class="workspace-head">
          <div>
            <p class="eyebrow">Data instance</p>
            <h1 class="title">Instance</h1>
          </div>
          <p class="summary">Fetch runtime and cache boundary for NewsNext API servers, remote clients, and self-hosted deployments.</p>
        </div>

        <div class="metrics" aria-label="Runtime metrics">
          <div class="metric">
            <p class="metric-value">${options.sourceCount}</p>
            <p class="metric-label">Sources</p>
          </div>
          <div class="metric">
            <p class="metric-value">${options.providerCount}</p>
            <p class="metric-label">Providers</p>
          </div>
          <div class="metric">
            <p class="metric-value">${options.categoryCount}</p>
            <p class="metric-label">Categories</p>
          </div>
          <div class="metric">
            <p class="metric-value">${options.requestCount}</p>
            <p class="metric-label">${escapeHtml(options.requestFrequency)}</p>
          </div>
          <div class="metric">
            <p class="metric-value">${options.cacheResultRatio}</p>
            <p class="metric-label">Cache hits</p>
          </div>
        </div>

        <div class="content">
          <section class="section" aria-label="Connection">
            <div class="section-head">
              <p class="label">Connect</p>
              <p class="mono">NEWSNEXT_INSTANCE_URL</p>
            </div>
            <div class="rows">
              <div class="row"><span class="method">GET</span><code>/sources</code></div>
              <div class="row"><span class="method">POST</span><code>/sources/:sourceId</code></div>
              <div class="row"><span class="method">GET</span><code>/debug</code></div>
            </div>
          </section>

          <section class="section" aria-label="Runtime">
            <div class="section-head">
              <p class="label">Runtime</p>
              <p class="mono">${escapeHtml(options.runtime)}</p>
            </div>
            <div class="rows">
              <div class="row"><span>Uptime</span><code>${escapeHtml(options.uptime)}</code></div>
              <div class="row"><span>Started</span><code>${escapeHtml(options.startedAt)}</code></div>
              <div class="row"><span>Cache</span><code>${escapeHtml(formatCache(options.cache))}</code></div>
            </div>
          </section>
        </div>

        <section class="lists" aria-label="Debug lists">
          <div class="list">
            <p class="label">Top Providers</p>
            <ol>${providerRows}</ol>
          </div>
          <div class="list">
            <p class="label">Categories</p>
            <ol>${categoryRows}</ol>
          </div>
          <div class="list">
            <p class="label">Hot Sources</p>
            <ol>${hotSourceRows}</ol>
          </div>
        </section>

        <section class="source-policies" aria-label="Source cache policies">
          <p class="label">Source maxCacheAge</p>
          <div class="policy-grid">${sourcePolicyRows}</div>
        </section>
      </section>
    </main>
  </body>
</html>`
}

function createRequestStats(): RequestStats {
  return {
    startedAt: Date.now(),
    requestCount: 0,
    sourceLoadCount: 0,
    sourceErrorCount: 0,
    cacheResultCount: 0,
    hotSources: new Map(),
  }
}

function renderLogoSvg(): string {
  return `<svg
    class="brand-mark"
    width="206"
    height="205"
    viewBox="0 0 206 205"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M206 63.8453C206 61.4117 206.001 58.9778 205.986 56.544C205.974 54.4937 205.95 52.444 205.894 50.3947C205.773 45.9283 205.508 41.4235 204.71 37.0068C203.9 32.5265 202.579 28.3566 200.495 24.2857C198.447 20.2845 195.772 16.6231 192.58 13.4488C189.389 10.2746 185.709 7.61408 181.686 5.57727C177.591 3.50365 173.397 2.18857 168.889 1.38325C164.451 0.590119 159.923 0.327153 155.435 0.206492C153.374 0.151013 151.313 0.127627 149.252 0.114939C146.805 0.100012 144.358 0.101256 141.911 0.101256L113.499 0H92.2493L64.3403 0.101256C61.8885 0.101256 59.4368 0.100012 56.9851 0.114939C54.9196 0.127627 52.8551 0.151013 50.7904 0.206492C46.2917 0.327153 41.7534 0.590368 37.3042 1.38449C32.791 2.18956 28.59 3.50414 24.4896 5.57628C20.4588 7.61333 16.7706 10.2741 13.5726 13.4488C10.3752 16.6229 7.69494 20.2835 5.64321 24.284C3.55422 28.3568 2.22973 32.5292 1.41824 37.0121C0.619245 41.427 0.354497 45.9303 0.232748 50.3947C0.177249 52.4442 0.153249 54.494 0.140749 56.544C0.125749 58.9781 0 62.0016 0 64.4354L0.000749994 91.8242L0 113.197L0.126999 141.168C0.126999 143.605 0.125999 146.042 0.140749 148.479C0.153249 150.532 0.177249 152.585 0.232998 154.637C0.354497 159.109 0.619745 163.621 1.41949 168.043C2.23073 172.53 3.55497 176.705 5.64221 180.781C7.69419 184.788 10.3749 188.455 13.5726 191.633C16.7704 194.812 20.4576 197.476 24.4876 199.516C28.5905 201.592 32.7935 202.909 37.3095 203.715C41.7567 204.51 46.2934 204.773 50.7904 204.894C52.8551 204.949 54.9198 204.973 56.9853 204.985C59.4371 205 61.8885 204.999 64.3403 204.999L92.5016 205H113.804L141.911 204.999C144.358 204.999 146.805 205 149.252 204.985C151.313 204.973 153.374 204.949 155.435 204.894C159.925 204.773 164.454 204.509 168.895 203.714C173.399 202.908 177.592 201.592 181.685 199.517C185.708 197.477 189.389 194.812 192.58 191.633C195.772 188.455 198.447 184.789 200.495 180.783C202.579 176.705 203.901 172.527 204.711 168.038C205.508 163.617 205.773 159.108 205.894 154.637C205.95 152.585 205.974 150.532 205.986 148.479C206.001 146.042 206 143.605 206 141.168C206 141.168 205.998 113.691 205.998 113.197V91.8018C205.998 91.4371 206 63.8453 206 63.8453"
      fill="currentColor"
    />
    <mask id="newsnext-instance-logo-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="206" height="205">
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M206 63.8453C206 61.4117 206.001 58.9778 205.986 56.544C205.974 54.4937 205.95 52.444 205.894 50.3947C205.773 45.9283 205.508 41.4235 204.71 37.0068C203.9 32.5265 202.579 28.3566 200.495 24.2857C198.447 20.2845 195.772 16.6231 192.58 13.4488C189.389 10.2746 185.709 7.61408 181.686 5.57727C177.591 3.50365 173.397 2.18857 168.889 1.38325C164.451 0.590119 159.923 0.327153 155.435 0.206492C153.374 0.151013 151.313 0.127627 149.252 0.114939C146.805 0.100012 144.358 0.101256 141.911 0.101256L113.499 0H92.2493L64.3403 0.101256C61.8885 0.101256 59.4368 0.100012 56.9851 0.114939C54.9196 0.127627 52.8551 0.151013 50.7904 0.206492C46.2917 0.327153 41.7534 0.590368 37.3042 1.38449C32.791 2.18956 28.59 3.50414 24.4896 5.57628C20.4588 7.61333 16.7706 10.2741 13.5726 13.4488C10.3752 16.6229 7.69494 20.2835 5.64321 24.284C3.55422 28.3568 2.22973 32.5292 1.41824 37.0121C0.619245 41.427 0.354497 45.9303 0.232748 50.3947C0.177249 52.4442 0.153249 54.494 0.140749 56.544C0.125749 58.9781 0 62.0016 0 64.4354L0.000749994 91.8242L0 113.197L0.126999 141.168C0.126999 143.605 0.125999 146.042 0.140749 148.479C0.153249 150.532 0.177249 152.585 0.232998 154.637C0.354497 159.109 0.619745 163.621 1.41949 168.043C2.23073 172.53 3.55497 176.705 5.64221 180.781C7.69419 184.788 10.3749 188.455 13.5726 191.633C16.7704 194.812 20.4576 197.476 24.4876 199.516C28.5905 201.592 32.7935 202.909 37.3095 203.715C41.7567 204.51 46.2934 204.773 50.7904 204.894C52.8551 204.949 54.9198 204.973 56.9853 204.985C59.4371 205 61.8885 204.999 64.3403 204.999L92.5016 205H113.804L141.911 204.999C144.358 204.999 146.805 205 149.252 204.985C151.313 204.973 153.374 204.949 155.435 204.894C159.925 204.773 164.454 204.509 168.895 203.714C173.399 202.908 177.592 201.592 181.685 199.517C185.708 197.477 189.389 194.812 192.58 191.633C195.772 188.455 198.447 184.789 200.495 180.783C202.579 176.705 203.901 172.527 204.711 168.038C205.508 163.617 205.773 159.108 205.894 154.637C205.95 152.585 205.974 150.532 205.986 148.479C206.001 146.042 206 143.605 206 141.168C206 141.168 205.998 113.691 205.998 113.197V91.8018C205.998 91.4371 206 63.8453 206 63.8453"
        fill="white"
      />
    </mask>
    <g mask="url(#newsnext-instance-logo-mask)">
      <path
        d="M206 169C206 225.885 159.885 272 103 272C46.1147 272 0 225.885 0 169C0 112.115 46.1147 66 103 66C159.885 66 206 112.115 206 169Z"
        fill="#FFF1DA"
      />
    </g>
  </svg>`
}

async function collectDebugInfo(
  instance: NewsNextDataInstance,
  sources: Awaited<ReturnType<NewsNextDataInstance["listSourceDescriptors"]>>,
  stats: RequestStats,
): Promise<HomePageOptions> {
  const instanceDebug = await instance.getDebugInfo?.() ?? {
    mode: "local" as const,
    runtime: "unknown",
    cache: {
      type: "unknown" as const,
    },
  }
  const uptimeMs = Date.now() - stats.startedAt
  const sourcePolicies = await instance.listSourceCachePolicies?.(sources) ?? instanceDebug.sourcePolicies ?? []

  return {
    ...instanceDebug,
    sourceCount: sources.length,
    providerCount: countUnique(sources.map(source => source.provider ?? source.id)),
    categoryCount: countUnique(sources.map(source => source.category)),
    startedAt: new Date(stats.startedAt).toISOString(),
    uptime: formatDuration(uptimeMs),
    requestCount: stats.requestCount,
    requestFrequency: formatNumber(stats.requestCount / Math.max(uptimeMs / 60_000, 1 / 60)),
    sourceLoadCount: stats.sourceLoadCount,
    sourceErrorCount: stats.sourceErrorCount,
    cacheResultRatio: formatRatio(stats.cacheResultCount, stats.sourceLoadCount),
    categories: topCounts(sources.map(source => source.category), 8),
    providers: topCounts(sources.map(source => source.provider ?? source.id), 8),
    hotSources: [...stats.hotSources.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([sourceId, count]) => ({ sourceId, count })),
    sourcePolicies,
    generatedAt: new Date().toISOString(),
  }
}

function renderCountRows(items: Array<{ name: string, count: number }>): string {
  if (items.length === 0) {
    return `<li><span>0</span> None</li>`
  }

  return items
    .map(item => `<li><span>${item.count}</span> ${escapeHtml(item.name)}</li>`)
    .join("")
}

function renderSourcePolicyRows(items: SourceCachePolicyInfo[]): string {
  if (items.length === 0) {
    return `<div class="policy-row"><div class="policy-cell policy-source">No sources</div><div class="policy-cell"></div><div class="policy-cell"></div><div class="policy-cell"></div></div>`
  }

  return items
    .map(item => `<div class="policy-row">
      <div class="policy-cell policy-source">${escapeHtml(formatSourceLabel(item))}</div>
      <div class="policy-cell"><code>${escapeHtml(item.sourceId)}</code></div>
      <div class="policy-cell">${escapeHtml(item.type)}</div>
      <div class="policy-cell policy-age">${escapeHtml(formatCacheAge(item.maxCacheAge))}${item.learned ? "" : " pending"}</div>
    </div>`)
    .join("")
}

function formatSourceLabel(item: SourceCachePolicyInfo): string {
  return item.title ? `${item.name} / ${item.title}` : item.name
}

function recordHotSource(stats: RequestStats, sourceId: string): void {
  stats.hotSources.set(sourceId, (stats.hotSources.get(sourceId) ?? 0) + 1)
}

function countUnique(values: string[]): number {
  return new Set(values).size
}

function topCounts(values: string[], limit: number): Array<{ name: string, count: number }> {
  const counts = new Map<string, number>()
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }))
}

function formatCache(cache: InstanceDebugInfo["cache"]): string {
  return cache.path ? `${cache.type} (${cache.path})` : cache.type
}

function formatCacheAge(value: number | null): string {
  if (value === null) {
    return "1 min"
  }

  const totalSeconds = Math.round(value / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) {
    return `${seconds}s`
  }

  if (seconds === 0) {
    return `${minutes} min`
  }

  return `${minutes} min ${seconds}s`
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours} hour(s) ${minutes} minute(s)`
  }

  if (minutes > 0) {
    return `${minutes} minute(s) ${seconds} second(s)`
  }

  return `${seconds} second(s)`
}

function formatRatio(value: number, total: number): string {
  if (total === 0) {
    return "not enough data"
  }

  return `${formatNumber((value / total) * 100)}%`
}

function formatNumber(value: number): string {
  return value.toFixed(2)
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;")
}

function success<T>(data: T): InstanceSuccessResponse<T> {
  return {
    success: true,
    data,
  }
}

function failure(code: string, message: string): InstanceErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
    },
  }
}

export async function readLoadSourceBody(request: Request): Promise<LoadSourceBody> {
  if (!request.body) {
    return {}
  }

  const body = await request.json().catch((): unknown => ({}))
  if (!body || typeof body !== "object") {
    return {}
  }

  return body as LoadSourceBody
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  })
}
