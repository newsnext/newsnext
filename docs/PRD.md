# NewsNext Product Requirements

Status: product direction and acceptance criteria. The baseline below reflects
repository code reviewed on 2026-09-08; requirements are not a claim that every
workflow has passed end-to-end acceptance.

## Product definition

NewsNext is an agent-programmable Board powered by stable data streams. Users
follow a subject through configured Sources; agents operate the same typed
Actions to discover Sources, organize Instances, and work with retained evidence.

Each Board has two views:

- **Now Layer:** one independent LiveCard per Instance, with shared reading,
  configuration, status, and refresh behavior.
- **Next Layer:** personalized Widgets that combine selected Board streams into
  useful views or derived results. Composition preserves each input's identity.

A Source acquires and normalizes data. An Instance gives that configuration a
stable identity and owning browser Worker. A Board owns Instances and Widget
placements. An Observation records sampled data at its actual fetch time.
A Widget presents selected inputs or a saved derived result.

## Product boundaries

- Reuse registered Sources and existing Instances before adding coverage.
  Personalized Source authoring remains an expert capability. Report gaps rather
  than silently installing new collection logic.
- Preserve Source boundaries in Now Layer. Next Layer may combine streams, but
  derived or reconciled values must not overwrite original observations.
- Widgets declare inputs; their rendering must not hide a crawler, read browser
  credentials, or execute Sources. Opening a materialized Widget reads its saved
  result without rerunning collection or processing.
- Human and agent operations share validation and persistence rules. Ephemeral
  exploration must not silently become a permanent Board, Job, or permission grant.
- Claims identify inputs, observation windows, transformations, and limitations.
  Missing from a sample does not mean deleted; observation time is not publication
  time; ranking movement alone does not prove popularity or cause.
- Standalone reading works without the daemon. Durable collection, History, and
  local Widget Snapshots use the connected CLI daemon and owning Workers.

Implementation boundaries live in [Application Architecture](APPLICATION_ARCHITECTURE.md)
and [Source Architecture](SOURCE_ARCHITECTURE.md). Future analytical processing
is defined in [Data Stream Architecture](DATA_STREAM_ARCHITECTURE.md). Keep API
schemas, transport details, and command syntax in those references and the
[CLI command reference](../skills/newsnext-cli/references/commands.md).

## Implemented baseline and remaining gaps

| Area | Current implementation | Remaining product work |
| --- | --- | --- |
| Sources | Registry discovery, structured/custom bundled loaders, parameters, Radar, permissions, secrets, validation, and CLI diagnostics | Versioned maintenance grants, repair/rollback, dependency health |
| Workspace | Browsers persist Boards, Instances, Widget placement/scope, and portable Settings; the daemon coordinates a revisioned in-memory snapshot | User-facing conflict and unavailable-Worker recovery |
| Now Layer | Independent LiveCards, routed Worker-local cache, protected refresh, generic fallback when registry entries disappear | Preserve this contract as collection and Widgets expand |
| Automatic collection | Daemon schedules all Workspace Instances, shares equivalent Worker-scoped streams, learns bounded intervals, and retains observations | Explicit retention controls, real-trace evaluation, broader health UX |
| History and Jobs | Turso datasets, observation reads/comparisons, recurring Jobs, and collection policy persistence | Retention/compaction, richer task attribution and provenance |
| Next Layer | Board-owned Widget layouts and scopes, local manifests/assets, sandboxed iframe rendering, managed Jobs, and revisioned Snapshots | Full discovery/preview/maintenance workflow, reusable transformations and templates |
| Code Widgets | Local iframe assets with host-controlled data delivery | Reviewed executable updates, resource budgets, version history, rollback, and broader acceptance testing |
| Diagnostics | Development panels expose collection state, observation counts, failures, and shared streams through subscriptions | Production-facing health and evidence inspection |

## Storage and refresh contract

| Data | Owner |
| --- | --- |
| Boards, Instances, Widget placement/scope, portable Settings | Browser storage; synchronized through the daemon's in-memory Workspace |
| Source permissions, credentials, device identity | Owning browser only |
| Current Source results | Owning Worker's replaceable Loader cache |
| History, Jobs, collection policies, Widget Snapshots | Daemon-owned local Turso database |
| Local Widget manifests and assets | CLI Widget directory |

Development and production default to `~/.config/newsnext.dev/` and
`~/.config/newsnext/`. Each contains `newsnext.db` and `widgets/`; runtime
configuration owns environment selection and explicit overrides. Database access
is daemon-only and requires no cloud account. Browser Workspace data is not moved
into the database.

Foreground reads refresh the current cache without directly inserting History.
Automatic daemon collection is independent of explicit Jobs and retains fresh
results, including unchanged content. It may retain a cached foreground result
at its original fetch time; dataset/timestamp uniqueness prevents duplicates.
Jobs and Widget materialization have their own schedules. Reading a Widget
Snapshot does not execute those schedules.

## User and agent workflows

1. Inspect a goal and existing Board context; discover reusable Sources and explain
   coverage before configuring Instances.
2. Browse current results independently, inspect parameters and permissions, and
   recover from unavailable Workers without losing Board membership.
3. Select one, several, or all Board Instances for a Widget. Preview inputs,
   processing, warnings, and proposed layout before saving when that workflow is
   available; saving must not grant unrelated authority.
4. Inspect freshness, supporting observations, transformations, and failures.
   Keep failed Widgets editable/removable and failures local to their Widget.
5. Propose coverage or configuration improvements without silently expanding
   permissions or rewriting evidence.

Examples include topic groups, change tracking, comparisons, contradiction
analysis, summaries, forecasts, and recurring reports. These are not a closed
Widget taxonomy. Future direct Widgets may read declared stored inputs in the UI;
the current materialized path reads daemon Snapshots.

## Permissions and recovery

The product requires explicit user approval for new hosts, secrets, materially
expanded/private collection, untrusted executable Sources, expanded Widget
capabilities, and destructive durable-data operations. A narrow maintenance grant
may allow reversible selector or mapping repairs within existing authority.
Automated changes must remain inspectable and versioned.

Stream inspection should explain purpose, Source/version, parameter overrides,
permission requirements without secret values, latest success/failure, and
consumers. Forecasts additionally expose assumptions and uncertainty. Templates
create Board-owned configuration instead of shared mutable state.

## Functional Requirements and Acceptance Criteria

### Storage and runtime requirements

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| DAT-01 | The desktop daemon is the only process that opens the product database | Browser extensions and CLI clients can read and mutate durable state only through validated daemon operations |
| DAT-02 | Development and production use separate directories | Development operations use `~/.config/newsnext.dev`; production uses `~/.config/newsnext`; an automated test proves the paths remain isolated |
| DAT-03 | Browser Workspace data is synchronized across supported browsers | Browsers retain snapshot update times; daemon startup selects and broadcasts the newest connected snapshot, and later mutations are revisioned without database persistence |
| DAT-04 | Database setup is local-first | First launch creates and migrates the local database without a Turso account, remote connection, or network access |
| DAT-05 | Schema initialization is atomic | The daemon creates the complete current schema transactionally before accepting requests and refuses incompatible versions |
| DAT-06 | Durable daemon mutations are transactional | A failed Widget, observation, or task mutation leaves no partially updated durable state |
| DAT-07 | Concurrent clients use one ordered writer | Independent bounded-wait reads remain available while the daemon serializes immediate write transactions and returns structured busy errors instead of hanging |
| DAT-08 | Now Layer does not create implicit History | Repeated view-driven refresh replaces the current browser-local result and does not insert observation rows; automatic collection and Jobs own retention, and collection may later retain a cached foreground result at its original fetch time |
| DAT-09 | Next Layer background work is Agent-owned | Widget query results commit as one revisioned Snapshot; stronger task/input/output atomicity remains target scope; opening Next Layer performs no implicit refresh or transformation |
| DAT-10 | Source execution remains browser-owned | Agent tasks request registered Source execution from a connected extension and receive normalized output without receiving browser credentials or duplicating the Source runtime |
| DAT-11 | Credentials remain browser-owned | Source credentials and browser session secrets never enter Native Messaging, IPC, logs, task inputs, materialized outputs, or database fields |
| DAT-12 | Database failures are diagnosable | CLI status and errors distinguish missing files, schema initialization failure, incompatible schema, lock contention, corruption, disk exhaustion, and unavailable browser Fetch authority |
| DAT-13 | Turso usage follows the official specification | Every Turso API and behavior used by production code is traceable through `https://docs.turso.tech/llms.txt`; undocumented assumptions are rejected during review |

### Board and Layer requirements

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| BRD-01 | A Board exposes Now Layer and Next Layer as two views of one context | Switching Layers preserves the Board identity, route context, and selection |
| BRD-02 | Both Layers consume canonical Instance state | Opening or rendering Next Layer does not create a second Instance or presentation-only Source execution |
| BRD-03 | Board deletion and other destructive changes remain explicit | The UI or Agent receives confirmation before durable Board data is deleted |
| BRD-04 | A Board persists its default Layer | Reopening a custom Board starts in its saved Now or Next Layer without changing its Board or Instance data |

### Now Layer requirements

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| NOW-01 | One Instance is shown through one independent LiveCard placement in a Board | Items from another Instance are never merged into that LiveCard's result |
| NOW-02 | All Sources use the shared LiveCard model | Source metadata and inline templates can vary content, but shared LiveCard identity, status, configuration, and interactions remain available |
| NOW-03 | Next Layer personalization does not mutate Now Layer structure | Adding, editing, moving, or deleting a Widget leaves Now Layer LiveCard composition unchanged |
| NOW-04 | Visible Now Layer content refreshes as current data | Viewing an active Board may refresh stale Instances and replace their cache without directly writing History |
| NOW-05 | Now Layer remains cache-only | Clearing the cache removes current results but never deletes durable Board, Widget, Agent task, or retained Next Layer data |

### Next Layer and Widget requirements

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| NXT-01 | A Board persists its Next Layer Widget composition | Widget identity, type, configuration, position, size, and dependencies survive extension restart |
| NXT-02 | A Widget can consume one, several, or all Board Instances | The saved input specification uses stable Instance identities and rejects unavailable or out-of-scope inputs |
| NXT-03 | A Widget can consume current results, observation ranges, and supported derived data | Each input declares its kind, dataset scope, time scope, and completeness state |
| NXT-04 | A Widget can create an open-ended derived result | The runtime is extensible beyond the initial built-in categories without changing the Board or Now Layer data model |
| NXT-05 | A Widget exposes provenance | The user or Agent can inspect input Instances, observation window, transformation version, warnings, and last computation time |
| NXT-06 | A Widget isolates failures | One failed transformation or renderer exposes a local error state and does not prevent other LiveCards or Widgets from working |
| NXT-07 | Corrected or reconciled values remain derived | Widget processing never silently changes stored Source results or historical observations |
| NXT-08 | Widgets expose useful runtime states | Empty, loading, stale, partial, failed, and ready states are distinguishable and accessible |
| NXT-09 | Widget layout is personalized without becoming a separate Board | The layout belongs to the current Board's Next Layer and retains that Board identity |
| NXT-10 | A Widget declares direct or materialized execution | Direct Widgets read selected stored inputs in the UI; materialized Widgets display an Agent-produced persisted result without rerunning its refresh or transformation on open |
| NXT-11 | Background refresh belongs to an Agent task | A task records its schedule, last attempt, last success, failure, retained inputs, and next eligible run independently of whether Next Layer is open |

### Agent and CLI requirements

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| AGT-01 | The Agent can discover Widget capabilities | The CLI returns stable operation names, descriptions, and machine-readable input and output schemas |
| AGT-02 | The Agent can inspect Board data before authoring a Widget | Queries expose a requested Board, available Instances, fields, observations, existing Widgets, and dependency health |
| AGT-03 | The Agent can preview before persistence | A preview returns the proposed result, provenance, warnings, and resource failures without modifying the Board |
| AGT-04 | The Agent can create, update, order, and delete Widgets | CLI changes use canonical Actions, validate at runtime, persist once, and propagate to open UI pages |
| AGT-05 | Agent changes are inspectable | Each durable Agent-created Widget, task, or derived dataset records its origin, version, configuration, and update time |
| AGT-06 | The Agent reuses existing capabilities | Before requesting new collection coverage or creating derived data, discovery identifies suitable registered Sources, Instances, transformations, or templates |
| AGT-07 | The Agent sees one environment-specific data model | Dev CLI queries use the dev database and production App queries use the production database without browser-profile-specific results |

### Source lifecycle requirements

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| SRC-01 | The Agent discovers registered Sources before configuring coverage | Discovery returns stable identities, capabilities, parameters, permissions, health, and supported environments |
| SRC-02 | Source execution returns structured diagnostics | Diagnostics cover fields, stable identity, duplicates, pagination, domains, permissions, secrets, result size, and security limits where applicable |
| SRC-03 | Instance creation uses an approved registered Source | The default product workflow cannot silently install or generate a personalized Source |
| SRC-04 | Material authority changes require approval | New host permissions, secrets, private data, executable logic, or expanded collection scope cannot be granted silently |
| SRC-05 | Installed streams expose health | Latest success, latest failure, Source version, configuration, schedule, warnings, and dependent Widgets are inspectable |
| SRC-06 | Maintenance is versioned and reversible | Automated repair is limited by the maintenance grant and retains the previous working version for rollback |

### Provenance and claim requirements

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| PRV-01 | Every derived result identifies its evidence scope | Input datasets, Instance identities, observation coverage, transformation, and completeness warnings are available |
| PRV-02 | The product distinguishes fact from interpretation | Direct observation changes, Agent inference, reconciliation, and forecast are labeled as different result kinds |
| PRV-03 | Forecasts communicate uncertainty | A forecast includes assumptions, confidence or range, evidence window, and conditions that could change it |
| PRV-04 | Sparse or partial data is not presented as continuous coverage | The Widget surfaces sampling gaps and relevant repository completeness warnings |

## Quality requirements

- Keep Board interaction responsive: bound computation, virtualize expensive
  lists, isolate failures, and avoid hidden subscriptions or duplicate execution.
  See [Performance Guideline](PERFORMANCE_GUIDELINE.md).
- Initialize/migrate schemas before serving database requests, reject unknown
  newer schemas, and never acknowledge partial durable writes. Retention and
  cache cleanup remain separate operations.
- Restrict Widget data/capabilities and require explicit CPU, memory, time,
  storage, and output budgets before treating arbitrary code as a general runtime.
  No undeclared network access or direct credentials.
- Keep diagnostic bodies opt-in. Local database protection currently relies on
  platform file permissions and operating-system disk protection; cloud sync and
  application-managed encryption are not prerequisites.
- Support keyboard operation, semantic labels, and non-color status cues.
  Layer navigation preserves Board context and scroll state. Empty and failed
  states must explain the next useful action.
- Version durable schemas and executable changes. Shared behavior must consume
  canonical contracts rather than browser- or CLI-specific copies.

## Delivery priorities

| Priority | Increment | Exit evidence |
| --- | --- | --- |
| P0 | Complete Widget discovery, preview, mutation, input inspection, and failure recovery around the existing local Widget foundation | Applicable NXT, AGT, and PRV criteria pass through UI and CLI; Now Layer stays independent |
| P1 | Stream maintenance, retention controls, health, and versioned repair | SRC criteria pass with permission review, rollback, and explicit coverage limits |
| P1 | Reusable typed transformations, derived datasets, Board/Widget templates | Multiple consumers reuse outputs with transitive provenance and compatible migrations |
| P2 | General restricted code Widget workflow | Capability denial, resource exhaustion, upgrade, failure containment, and rollback verified |

Do not reimplement the existing daemon, collection, or Widget foundations as
future phases. Extend them while preserving the acceptance criteria above.

## Measurement

Set numerical targets after measuring the implemented baseline. Track time to a
useful Board, Source/Instance reuse, repeat Widget use, multi-stream usefulness,
scheduled-run health, repair time, and completeness of derived provenance.
Unauthorized authority changes, presentation-only Source executions, cross-browser
acknowledged mutation loss, and development/production crossover must remain zero.
Distinguish direct foreground History writes from later automatic retention.

Validate whether users understand Now versus Next, Instance versus combined Widget,
observed facts versus inference, and why new permissions or permanent work are
being proposed. Synthetic replay results do not establish production freshness.

## Open decisions and risks

- Define retention/compaction and task attribution without losing required evidence.
- Choose a minimal reusable transformation and declarative Widget contract before
  broadening executable capabilities.
- Specify which Source repairs a maintenance grant allows and how versions roll back.
- Make sparse coverage, conflicting inputs, and forecasts understandable in Widgets.
- Determine when an otherwise healthy stream no longer contributes useful data.

The main risks are competing state owners, hidden collection or authority expansion,
unsafe Widget execution, schema breakage, and claims stronger than sampled evidence.
The boundaries and acceptance criteria above are intended to constrain them.
