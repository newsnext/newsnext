# Chrome Web Store readiness review

Historical review: **2026-08-30**, extension **1.0.0-beta.3** (manifest `1.0.0`).
The decision at that time was **not ready for submission**. This record preserves
findings and release follow-up; it is not a current certification or dependency
audit. Recheck the exact production ZIP and current store policies before release.

## Findings and follow-up

| ID | Finding at review time | Required follow-up |
| --- | --- | --- |
| CWS-01 | No published privacy policy; `/privacy` and `/privacy-policy` returned 404 | Publish/link a policy covering data, purposes, storage, retention, deletion, recipients, and Limited Use |
| CWS-02 | Source permission UI did not sufficiently explain authentication data access | Explain which site data is read, why, caching/retention, local desktop transfer, and revocation before affirmative authorization |
| CWS-03 | Some authentication tokens, including Jike refresh tokens, were cached as plaintext in extension storage | Review cache necessity and retention; prefer reading at use time, keep secrets out of exports, and document the final policy |
| CWS-04 | Store listing materials were incomplete | Prepare accurate copy, screenshots, promotional tile, support URL, privacy answers, permission justifications, and reviewer instructions |
| CWS-05 | Manifest description was vague and used an unsupported superlative | Align localized descriptions with the extension's actual single purpose |
| CWS-06 | Desktop integration requested install-time permissions despite being disabled by default | Verify optional enablement, denial/revocation, and justification of remaining required permissions |
| CWS-07 | Broad optional host declaration needed justification | Explain arbitrary user-selected feed origins and verify narrow point-of-use grants, including HTTP feeds |
| CWS-08 | Externally supplied declarative providers needed MV3 interpreter review | Resolve production exposure and policy interpretation; document representative inputs and bounded execution for reviewers |
| CWS-09 | X bundled a web-client Bearer token and depended on undocumented GraphQL operations | Document provenance, review service compatibility, and verify clear failure behavior |
| CWS-10 | Dependency audit failed | Rerun the audit, triage runtime/build reachability, update affected dependencies, and inspect the submitted bundle |

CWS-01 through CWS-04 were submission blockers; CWS-05, CWS-06, and CWS-08 also
required release decisions. Do not infer closure merely from a newer dependency
lockfile or code change.

Repository review on 2026-09-08 confirms one partial change to CWS-06:
`apps/extension/wxt.config.ts` now lists Native Messaging among optional permissions
outside development YOLO mode. Loopback host access and `alarms` remain required.
The remaining findings have not been re-audited as part of this document cleanup.

## Historical verification evidence

The 2026-08-30 review covered the production manifest/ZIP, CSP, permissions,
Source execution, local storage, Native Messaging, and repository checks.
It did **not** install or automate the packed production extension.

| Check | Recorded result |
| --- | --- |
| Public build, typecheck, tests, ZIP | Passed; 56 test files / 443 tests |
| Submission artifact | 962.21 KB ZIP, 2.81 MB unpacked, 40 files, no source maps |
| Private desktop checks at that time | TypeScript, 4 UI tests, bindings, formatting, Clippy, 73 Rust tests passed |
| Dependency audit | Failed: 1 critical, 21 high, 20 moderate, 4 low advisories |

Many advisories were development dependencies; vulnerable package names were not
detected in the inspected extension JavaScript. That historical observation does
not establish that the current build is unaffected.

The inspected build used MV3, packaged scripts, bounded Radar extraction,
Source-scoped permission requests and session request rules, isolated local Widget
iframes, validated Native Messaging, and separate development/production host IDs.
No evaluated or remotely loaded JavaScript was detected. Reverify these properties
on the release artifact; implementation boundaries are maintained in
[Source Architecture](SOURCE_ARCHITECTURE.md).

## Release checklist

- Finalize a factual single-purpose statement and detailed description. Suggested
  wording: “Follow user-selected web sources in a browser-native reading board.”
  Explain optional local History, CLI access, and Widgets as supporting features.
- Prepare the store icon, accurate production screenshots, small promotional tile,
  category/language, verified homepage, support URL, and reviewer instructions.
- Match privacy declarations to website content, browsing activity, authentication,
  user configuration, local storage, and optional desktop transfer. Resolve the
  interpreter question before selecting remote-code declarations.
- Justify `activeTab`, `scripting`, `storage`, `contextMenus`, request rules,
  cookies, dynamic hosts, Native Messaging, loopback access, and `alarms` against
  the exact submitted manifest and point-of-use behavior.
- Run `bun audit --json`, `bun run typecheck`, `bun run test`, and
  `bun --filter=@newsnext/extension run zip:chrome` from `web/`. Record remaining
  exceptions and inspect the extracted ZIP's manifest and referenced assets.
- Run the private CLI's applicable checks from `cli/`; the historical desktop UI
  command is no longer an instruction for this repository.
- Install the exact packed extension and test standalone first run, public and
  authenticated Sources, host grant/denial/revocation, and Clear User Data.
- Test optional desktop enablement, connection, disablement, and revocation, including
  the production host allowlist for `fabmpgknlkdgcgaidafajbhfnnlabaja`.
- Compare the final package, listing, policy, and Dashboard declarations. Submit only
  after blockers are resolved and packed-production checks pass.

## Policy references from the review

These links are retained for rechecking, not a claim that their contents were
revalidated during this cleanup.

- [User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq), [Limited Use](https://developer.chrome.com/docs/webstore/program-policies/limited-use), [Privacy Practices](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [Disclosure requirements](https://developer.chrome.com/docs/webstore/program-policies/disclosure-requirements)
- [Listing information](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)
- [Program policies](https://developer.chrome.com/docs/webstore/program-policies/policies), [Quality guidelines FAQ](https://developer.chrome.com/docs/webstore/program-policies/quality-guidelines-faq)
- [Permissions API](https://developer.chrome.com/docs/extensions/reference/api/permissions), [Permission warnings](https://developer.chrome.com/docs/extensions/develop/concepts/permission-warnings)
- [MV3 requirements](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements)
