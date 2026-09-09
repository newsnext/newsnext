import { createFileRoute, Link } from "@tanstack/react-router"
import { DocumentPage } from "../components/document-page"

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy policy · NewsNext" },
      { name: "description", content: "How the NewsNext browser extension accesses, uses, stores, and shares data." },
      { property: "og:title", content: "Privacy policy · NewsNext" },
      { property: "og:url", content: "https://newsnext.app/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://newsnext.app/privacy" }],
  }),
  component: PrivacyPage,
})

function PrivacyPage() {
  return (
    <DocumentPage title="Privacy policy">
      <p className="text-sm text-(--muted)">Last updated: September 8, 2026</p>
      <p>This policy describes data handling by the NewsNext browser extension, maintained by the NewsNext project, including its optional connection to the local desktop companion.</p>

      <h2>Data we access and why</h2>
      <p>NewsNext helps you follow websites and feeds in a personal board. It processes the sources you choose, their URLs and parameters, retrieved content, and your board and preference settings to display and refresh that information.</p>
      <p>When you use source discovery on a page, NewsNext may read its URL and relevant page content to find available feeds and sources. It does not request Chrome browsing-history access.</p>
      <p>Requests to sources may use your existing signed-in website session. For sources that require it, NewsNext can read specific cookies or website local-storage values after the necessary website and cookie permissions are granted. These values are used to authenticate source requests; some are cached in the extension’s local storage.</p>

      <h2>Storage and the desktop companion</h2>
      <p>Settings, boards, source configuration, cached results, and cached authentication values are stored in your browser profile. Local storage is not a separate encrypted credential vault.</p>
      <p>If you enable native integration, NewsNext communicates with its companion on your computer. Workspace configuration, collected source results, and operational diagnostics may be exchanged so the companion can retain history and provide local CLI and agent access. Programs you authorize to use that companion can access the data it exposes.</p>

      <h2>Network requests and sharing</h2>
      <p>Source requests go to the websites and APIs used by your selected sources. Those services receive the request data, your IP address, and applicable session credentials. Custom registries receive requests to download their source definitions. Only enable sources and registries you trust.</p>
      <p>Images and provider icons may load from their original hosts. When a provider has no icon, the default fallback requests one from Favicon.im using the source’s hostname. You can choose another icon service or a custom template in Settings; depending on the template, that service receives the hostname or origin. These services also receive ordinary network request information, including your IP address.</p>
      <p>NewsNext does not sell user data or use it for advertising, credit decisions, or lending. The extension does not include an advertising or analytics tracker. Third-party websites and services handle the requests they receive under their own privacy policies.</p>

      <h2>Your choices and deletion</h2>
      <p>You can remove sources, revoke website and cookie access in Settings or Chrome’s extension controls, and disable native integration. Revoking access stops future access but does not erase previously stored results.</p>
      <p>Use the data controls in Settings to export supported settings and board data or clear extension user data. Portable exports exclude cached authentication values. Uninstalling the extension removes its browser-managed local data; it does not delete desktop companion history, exported files, backups, or data held by source websites. Manage those copies separately.</p>

      <h2>Limited Use</h2>
      <p>NewsNext complies with the Chrome Web Store User Data Policy, including its Limited Use requirements. Information accessed through Chrome and Google APIs is used only to provide the user-facing features described here. It is not transferred for advertising, sold to data brokers, or used for unrelated purposes. The maintainers do not receive your locally stored source content through a remote collection service.</p>

      <h2>Contact and changes</h2>
      <p>
        For questions about this policy or your data, use our
        {" "}
        <Link to="/support">support page</Link>
        . If you contact us, we use the information you choose to provide to respond and investigate your request. Do not include credentials or private source content in a public issue.
      </p>
      <p>We will update this page when data handling changes and revise the date above.</p>
    </DocumentPage>
  )
}
