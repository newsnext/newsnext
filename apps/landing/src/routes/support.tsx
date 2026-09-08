import { createFileRoute, Link } from "@tanstack/react-router"
import { DocumentPage } from "../components/document-page"

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support · NewsNext" },
      { name: "description", content: "Get help with NewsNext, report a problem, or ask about privacy." },
      { property: "og:title", content: "Support · NewsNext" },
      { property: "og:url", content: "https://newsnext.app/support" },
    ],
    links: [{ rel: "canonical", href: "https://newsnext.app/support" }],
  }),
  component: SupportPage,
})

function SupportPage() {
  return (
    <DocumentPage title="Support">
      <p>Need help with NewsNext? Search existing issues or open a new one on the project’s GitHub repository.</p>
      <p><a href="https://github.com/newsnext/newsnext/issues" target="_blank" rel="noreferrer">Get help on GitHub ↗</a></p>
      <h2>Report a problem</h2>
      <p>Include your NewsNext version, Chrome version, operating system, steps to reproduce the problem, and what you expected to happen. For a source issue, include its name and any error message.</p>
      <p>GitHub issues are public. Remove cookies, tokens, private URLs, and personal content from screenshots or logs before sharing them.</p>
      <h2>Source access</h2>
      <p>If a source cannot load, check its website permissions in Settings. Sources that depend on an account may require you to sign in to the original website again.</p>
      <h2>Privacy and your data</h2>
      <p>
        Read our
        {" "}
        <Link to="/privacy">privacy policy</Link>
        {" "}
        for details about website access, local storage, third-party requests, and deleting data. You can use GitHub issues for general privacy questions without posting personal data.
      </p>
    </DocumentPage>
  )
}
