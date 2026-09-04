# Chrome Web Store Readiness Review

**Review date:** 2026-08-30
**Extension version:** `1.0.0-beta.3` (`manifest.version` is `1.0.0`)
**Target:** Chrome Manifest V3
**Decision:** Not ready for review submission

## Executive Summary

NewsNext can produce a structurally valid Chrome Web Store ZIP, and its extension and desktop integration pass the current repository verification suites. The submitted package is Manifest V3, uses a restrictive extension-page Content Security Policy, does not contain detected `eval`, `new Function`, or remotely loaded JavaScript, and keeps broad website access optional and requested per Source.

The product is not yet ready for Chrome Web Store review. The release is blocked by missing privacy and store-listing materials, insufficient in-product disclosure before authentication data is read, plaintext persistence of some authentication tokens, and permissions that are required at installation even though the corresponding desktop feature is disabled by default. The native-connected developer Source runner also needs an explicit policy decision because its declarative interpreter may receive Source definitions from outside the submitted package.

## Scope

This review covered:

- the production WXT configuration and generated Chrome manifest;
- the generated submission ZIP and its packaged scripts and assets;
- extension permissions, CSP, web-accessible resources, message boundaries, local storage, Source execution, and Native Messaging;
- Chrome Web Store privacy, minimum-permission, single-purpose, listing, code-readability, and Manifest V3 remote-code requirements;
- the public landing site and expected privacy-policy routes;
- the desktop Native Messaging production identity and protocol validation;
- TypeScript, Rust, UI, and repository tests;
- the Bun dependency audit for the public workspace.

Browser automation and installation of the packed extension were not performed. A packed-extension smoke test remains required after the blockers below are addressed.

## Release Decision

| Area | Status | Summary |
| --- | --- | --- |
| Production build | Pass | Chrome MV3 ZIP builds successfully. |
| Automated verification | Pass | Public and private repository checks pass. |
| MV3 code model and CSP | Pass with review note | No detected remote JavaScript execution; the external declarative Source runner needs policy review. |
| Permission design | Needs changes | Source host access is optional, but desktop-only permissions are required at installation. |
| User-data handling | Blocked | Authentication data is read and some tokens are persisted without sufficient disclosure or an adequate storage policy. |
| Privacy policy | Blocked | No published privacy policy was found. |
| Store listing | Blocked | Required listing copy, screenshots, promotional asset, support URL, and privacy declarations are not prepared in the repository. |
| Dependency audit | Needs remediation | The workspace audit fails, although most reported packages are development-only and were not detected in the submission bundle. |

## Blocking Findings

### CWS-01: No Published Privacy Policy

**Severity:** Blocker
**Policy areas:** User Data, Limited Use, Privacy Practices

The extension handles website URLs and content, authentication cookies, and authentication values read from site local storage. Chrome treats these as user data even when they are processed or stored only on the user's device.

No privacy-policy source was found in the repository. At review time, both of these routes returned HTTP 404:

- `https://newsnext.app/privacy`
- `https://newsnext.app/privacy-policy`

**Required remediation:**

1. Publish a privacy policy on the NewsNext-owned website.
2. Link it from the site homepage and Chrome Web Store Developer Dashboard.
3. Describe every handled data class, including browsing activity, website content, authentication cookies and tokens, Source parameters, locally cached results, Boards, and optional desktop transfer.
4. State purposes, storage locations, retention, deletion controls, recipients, security measures, and whether any data is sold, used for advertising, or read by humans.
5. Include an affirmative Chrome Web Store Limited Use statement.
6. Keep the policy, Dashboard declarations, listing, and actual behavior consistent.

**Official references:**

- [Chrome Web Store User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [Limited Use requirements](https://developer.chrome.com/docs/webstore/program-policies/limited-use)
- [Privacy Practices fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)

### CWS-02: Insufficient Prominent Disclosure Before Authentication Data Access

**Severity:** Blocker
**Policy areas:** Disclosure Requirements, User Data

The Source permission UI identifies requested sites and marks some sites as using cookies, but it does not explain what authentication data will be read, why it is needed, whether it will be cached, how long it will remain, or where it may be sent. See `apps/extension/src/components/live-card/source-permission-details.tsx` and `apps/extension/src/components/live-card/card-front.tsx`.

Chrome requires a prominent in-product disclosure and affirmative user action when sensitive data handling would not be obvious to the user. A privacy policy or store description alone is insufficient.

**Required remediation:**

1. Before requesting Cookie and host permissions, explain that NewsNext may read the user's authenticated session from the named site to load the selected Source.
2. Distinguish cookies from local-storage access and identify whether credentials are cached.
3. Explain that Source requests are sent directly to the selected service and that optional desktop synchronization remains local to the device.
4. Require an explicit affirmative action after the disclosure.
5. Make revocation and deletion controls discoverable from the disclosure and Settings.

**Official reference:** [Disclosure Requirements](https://developer.chrome.com/docs/webstore/program-policies/disclosure-requirements)

### CWS-03: Authentication Tokens Persisted in Plaintext Extension Storage

**Severity:** High / release blocker
**Policy areas:** Secure Handling, Authentication Information

`apps/extension/src/lib/background/source-secrets.ts` caches cacheable Source secrets under `newsnext-source-secrets` in `chrome.storage.local`. The Jike provider declares access and refresh tokens without disabling caching in `registry/src/jike/index.ts`, so both may be persisted as plaintext values.

The existing Clear User Data action removes saved Source secrets, but deletion support does not by itself make plaintext long-term token storage appropriate.

**Required remediation:**

1. Prefer reading session data at use time and mark authentication tokens `cache: false` unless persistence is essential.
2. Do not persist long-lived refresh tokens in extension storage without a documented, reviewed protection design.
3. Define a retention and invalidation policy for any remaining cached secret.
4. Ensure exported portable user data never contains Source secrets.
5. Add deterministic tests for secret cache policy where the logic can remain pure.
6. Document the final behavior in the privacy policy and prominent disclosure.

### CWS-04: Required Store Listing Package Is Missing

**Severity:** Blocker
**Policy areas:** Listing Requirements, Minimum Functionality

The repository contains valid extension icons, including the required 128×128 icon, but no Chrome Web Store listing package was found. Missing material includes:

- a clear single-purpose statement;
- a detailed store description;
- at least one accurate 1280×800 or 640×400 screenshot;
- a 440×280 small promotional tile;
- permission justifications;
- a support URL;
- privacy-practices answers and Limited Use certification;
- reviewer instructions for optional desktop integration and authenticated Sources.

The marquee tile and promotional video are optional, but may be supplied.

**Required remediation:** Create the complete listing package using screenshots of the actual production extension and keep all copy aligned with current functionality.

**Official reference:** [Complete your listing information](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)

### CWS-05: Manifest Description Does Not State a Clear Single Purpose

**Severity:** High
**Policy areas:** Single Purpose, Listing Metadata

The production manifest currently says:

> Elegant reading experience, Fastest information reception

This text is vague, uses an unsupported superlative, and does not explain the extension's browser function. It does not give reviewers or users a clear reason for website, Cookie, scripting, request-rule, or Native Messaging access.

**Required remediation:** Replace it with a concise factual statement focused on one purpose, for example:

> Follow user-selected web sources in a browser-native reading board.

The store listing may describe optional local desktop history and agent context as supporting features, but all features and permissions must remain tied to the same primary purpose.

**Official references:**

- [Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies)
- [Extensions quality guidelines FAQ](https://developer.chrome.com/docs/webstore/program-policies/quality-guidelines-faq)

## High-Risk Review Findings

### CWS-06: Desktop-Only Permissions Are Required at Installation

**Severity:** High
**Policy area:** Minimum Permission

The manifest requires `nativeMessaging` and `http://127.0.0.1/*`, while `nativeIntegrationEnabled` defaults to `false`. Chrome displays a Native Messaging warning at installation even when the user never enables the desktop feature.

`alarms` is also currently used only by the desktop reconnection loop, although it does not itself produce a warning.

**Recommended remediation:**

- move `nativeMessaging` to `optional_permissions` and request it from the explicit Enable App Integration gesture;
- move loopback host access to optional host permissions and request it with the desktop integration;
- review whether `alarms` should also be optional;
- handle denial and later revocation without breaking standalone Sources;
- justify every remaining required permission in the Dashboard.

Chrome documents `nativeMessaging` as optional-capable and recommends optional permissions for optional features.

**Official references:**

- [chrome.permissions](https://developer.chrome.com/docs/extensions/reference/api/permissions)
- [Permission warning guidelines](https://developer.chrome.com/docs/extensions/develop/concepts/permission-warnings)

### CWS-07: Broad Dynamic Optional Host Declaration Requires Strong Justification

**Severity:** Medium to High
**Policy area:** Minimum Permission

The manifest declares `*://*/*` in `optional_host_permissions`. Runtime behavior is materially better than this declaration suggests: NewsNext calculates Source-specific origins, requests them at point of use, displays them to the user, and supports revocation.

The broad declaration is still subject to the minimum-permission policy, including when optional. Chrome explicitly supports `https://*/*` for origins discovered at runtime.

**Recommended remediation:**

1. Prefer `https://*/*` for normal Sources.
2. Treat HTTP feeds as an explicit exceptional flow with a clear security warning and the narrowest possible origin request.
3. Document why arbitrary user-selected feed origins are necessary.
4. Retain per-origin requests and the existing permission management UI.

### CWS-08: Externally Supplied Declarative Sources May Trigger MV3 Interpreter Review

**Severity:** High review uncertainty
**Policy area:** Additional Requirements for Manifest V3

The bundled registry is packaged with the extension, which is compliant with the self-contained-code requirement. However, the connected `developer.runSource` action can receive a declarative provider over Native Messaging and execute its structured Source definition through the packaged Liquid, JMESPath, HTML, JSON, RSS, and request runtime.

This is not direct remote JavaScript execution, but Chrome explicitly scrutinizes interpreters that run complex commands received as data. The private desktop implementation is not part of the extension submission, which may make the full behavior harder for a reviewer to determine.

**Required decision before submission:**

- Prefer excluding developer-only arbitrary provider execution from the Chrome Web Store production build; or
- obtain a defensible policy interpretation, strictly bound the declarative language, and give reviewers complete instructions and representative inputs.

Do not declare that the extension executes remote code unless the final production behavior actually meets Chrome's definition. The answer must match the submitted package exactly.

**Official reference:** [Additional Requirements for Manifest V3](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements)

### CWS-09: Bundled X Web Credential and Undocumented API Dependency

**Severity:** Medium
**Areas:** Security review, reliability, third-party service risk

`registry/src/x/utils.ts` contains the Bearer token used by X's web client, and that token is present in the production bundle. This appears to be a publicly distributed web-client credential rather than a NewsNext-owned secret, but reviewers can reasonably question why a credential is embedded and how authenticated X data is accessed.

The X implementation also depends on undocumented GraphQL query IDs and browser-session behavior, which can break during review or after publication.

**Recommended remediation:**

- document the credential's provenance and why it is not a private NewsNext secret;
- confirm that use complies with applicable X terms and policies;
- ensure failures are clearly communicated rather than silently degrading;
- consider excluding fragile authenticated Sources from the first store release if they cannot be supported reliably.

### CWS-10: Dependency Audit Is Not Clean

**Severity:** Medium release risk

`bun audit --json` reported:

| Severity | Advisory count |
| --- | ---: |
| Critical | 1 |
| High | 21 |
| Moderate | 20 |
| Low | 4 |

The critical `shell-quote` path and many other findings come from development tools such as React Cosmos, WXT, Vite, or linting/build dependencies. Vulnerable package names were not detected in the generated extension JavaScript during this review. An older `undici` is also present through the runtime package graph, although it was not detected in the submitted bundle.

This result does not establish an exploitable vulnerability in the ZIP, but a failed audit should not be carried into a release without triage.

**Required remediation:**

1. Update direct and transitive dependencies where fixes exist.
2. Record which advisories are production-reachable, build-only, or false positives for the browser bundle.
3. Rebuild and rerun the audit.
4. Confirm that no vulnerable Node-only dependency is packaged into the extension.

## Passed Security and Packaging Checks

- The generated manifest uses Manifest V3.
- The extension-page CSP is `script-src 'self'; object-src 'self'` with a loopback-only `frame-src` exception.
- No `unsafe-eval`, `unsafe-inline`, remote script source, `eval`, `new Function`, or remote `importScripts` usage was detected.
- The inspected `innerHTML` and `outerHTML` usage reads bounded page selections for Radar; it does not write untrusted HTML into an extension page.
- No sensitive use of `chrome.storage.sync` was found.
- The extension does not expose `externally_connectable` message handlers.
- The CLI permission message listener restricts messages to the exact extension-owned permission page and validates message structure and pending request IDs.
- `app.html` is exposed only to the configured RSSHub Radar extension ID.
- Source host and Cookie permissions are calculated per Source and requested from user gestures.
- Users can revoke site permissions and clear Boards, LiveCards, settings, Source secrets, cached data, and site permissions.
- Source request rules are session rules restricted to the extension's initiator domain.
- Local Widgets run in sandboxed loopback iframes without `allow-same-origin`; messages are accepted only from the expected frame window.
- The Native Messaging protocol validates message shapes, protocol version, widget-server loopback origin, request IDs, and payload limits.
- Development and production Native Messaging identities are separate.
- The production Chromium extension ID `fabmpgknlkdgcgaidafajbhfnnlabaja` matches the desktop Native Messaging allowlist.
- Required icon sizes 16, 32, 48, and 128 are present and valid PNG files.
- The generated ZIP contains no source-map files; minification itself is allowed by Chrome's code-readability policy.

## Verification Evidence

### Public Repository

Commands executed from `web/`:

```text
bun run build:chrome
bun run typecheck
bun run test
bun --filter=@newsnext/extension run zip:chrome
bun audit --json
```

Results:

- production build passed;
- TypeScript project build passed;
- 56 test files passed;
- 443 tests passed;
- ZIP generation passed;
- unpacked extension size: 2.81 MB;
- submitted ZIP size: 962.21 KB;
- ZIP contents: 40 files;
- background service worker: approximately 807 KB;
- dependency audit failed with the advisory counts recorded above.

### Private Desktop Repository

Command executed from `desktop/`:

```text
bun run verify
```

Results:

- UI TypeScript check passed;
- 4 UI tests passed;
- generated bindings check passed;
- Rust formatting check passed;
- Clippy passed with warnings denied;
- 73 Rust tests passed.

Both repositories were clean after verification.

## Proposed Store Positioning

### Single Purpose

> NewsNext lets users follow selected web sources in a browser-native reading board.

### Short Description Candidate

> Follow user-selected web sources in a browser-native reading board.

### Feature Boundaries

The listing should describe these as parts of the same purpose:

- viewing registered and user-selected Sources in LiveCards;
- detecting relevant Sources for the current tab after a user gesture;
- accessing authenticated Sources only after site-specific authorization;
- optionally connecting to the local NewsNext desktop App for durable History, CLI orchestration, and local Widgets.

The listing should not imply that the desktop App is required for the standalone reading-board experience unless that becomes true in the submitted build.

## Dashboard Preparation Checklist

### Store Listing

- [ ] Finalize the single-purpose statement.
- [ ] Replace the manifest short description.
- [ ] Write a factual detailed description covering all major features.
- [ ] Upload the 128×128 store icon.
- [ ] Capture at least one accurate production screenshot.
- [ ] Create the 440×280 small promotional tile.
- [ ] Select the correct category and primary language.
- [ ] Set `https://newsnext.app/` as the homepage and verify site ownership.
- [ ] Publish and provide a support URL.
- [ ] Avoid unsupported performance superlatives and keyword stuffing.

### Privacy Practices

- [ ] Provide the published privacy-policy URL.
- [ ] Declare website content and resources.
- [ ] Declare web browsing activity where current-page Radar behavior applies.
- [ ] Declare authentication information for Cookie/localStorage-backed Sources.
- [ ] Declare user-generated content or Source parameters where applicable.
- [ ] Describe local browser storage and optional local desktop transfer accurately.
- [ ] Certify Limited Use only after behavior and policy match the certification.
- [ ] Select “No remote code” only after resolving the external Source interpreter decision.

### Permission Justifications

- [ ] `activeTab`: inspect the current tab after the user opens Radar or invokes the relevant action.
- [ ] `scripting`: read bounded Source-discovery fields and explicitly authorized site storage from the selected tab.
- [ ] `storage`: persist Boards, settings, cached results, device state, and the final approved secret policy.
- [ ] `contextMenus`: provide the toolbar context-menu entry that opens NewsNext.
- [ ] `declarativeNetRequestWithHostAccess`: apply Source-specific request headers only for authorized Source origins.
- [ ] `cookies`: read authentication cookies only for a Source explicitly authorized by the user.
- [ ] dynamic host access: load only user-selected Sources and feeds from origins approved at point of use.
- [ ] `nativeMessaging`: communicate with the optional local NewsNext desktop App after explicit enablement.
- [ ] loopback host access: fetch and sandbox local Widget files from the connected NewsNext App.
- [ ] `alarms`: reconnect the explicitly enabled local App integration without a persistent service worker.

## Required Final Verification

After remediation:

1. Run `bun audit --json` and document all remaining exceptions.
2. Run `bun run typecheck` and `bun run test` from `web/`.
3. Run `bun --filter=@newsnext/extension run zip:chrome`.
4. Extract the exact ZIP and verify its manifest and referenced files.
5. Install and test the packed production extension in Chrome.
6. Verify standalone first-run behavior without the desktop App.
7. Verify one public Source, one site-specific host permission, one authenticated Source, permission denial, permission revocation, and Clear User Data.
8. Verify optional desktop permission grant, connection, disablement, and revocation.
9. Verify the production Native Messaging host recognizes extension ID `fabmpgknlkdgcgaidafajbhfnnlabaja`.
10. Compare the final listing, privacy policy, Dashboard declarations, and production behavior for exact consistency.

The extension should be submitted only after every blocker is closed and the packed-production smoke test passes.
