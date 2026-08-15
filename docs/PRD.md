# NewsNext Product Requirements

Status: draft product requirements for phased delivery. Phase 1 is the minimum
product increment; later phases remain target scope. This document does not
imply that every capability described below is implemented.

Document purpose: align product, design, engineering, and Agent behavior around
one target model; distinguish the implemented baseline from planned work; and
provide acceptance criteria for incremental delivery.

## Product Definition

NewsNext is an agent-programmable board powered by stable data streams.

Users create Boards for subjects they want to understand over time. Sources
continuously collect and normalize relevant information. Each Board has two
views, named Now Layer and Next Layer. Now Layer presents current news through
one unified Card model. Next Layer lets personalized Widgets process any
combination of the Board's data
streams. An Agent can operate the same product through the CLI: it can discover
or author Sources, configure data streams, organize Boards, analyze
observations, and create or maintain Widgets.

The primary product distinction is not generated UI. It is the durable data
stream behind the UI:

> Other boards display data the user already has. NewsNext can establish and
> continuously maintain the data streams the user needs.

The short product promise is:

> Tell NewsNext what you want to keep understanding. It builds and maintains
> the data streams and two Board views for that subject.

## Problem

Web research and agent-generated reports are usually one-off results. Repeating
the same task may use different pages, rankings, or scopes, and it rarely
preserves enough history to explain what appeared, disappeared, or changed.

Traditional dashboards solve presentation after a user has already acquired,
structured, and maintained the data. Feed readers provide recurring inputs but
usually limit users to predefined list views and simple filters.

NewsNext must combine both sides:

- Stable, inspectable data collection that continues after the initial request.
- One consistent Card experience for reading current news from different
  Sources in Now Layer.
- Flexible, agent-created processing and Widgets that answer the user's
  evolving questions in Next Layer.
- Historical observations that support comparison without overstating what the
  collected samples prove.
- One shared application model for human interactions and CLI automation.

## Goals

1. Let a user establish a Board for a subject they want to understand over
   time, without first building a data pipeline or dashboard by hand.
2. Preserve every configured Instance as a stable, independently inspectable
   data stream in Now Layer.
3. Let Next Layer combine Board data into personalized Widgets whose purposes
   are not limited to a predefined analysis catalog.
4. Let an Agent create and maintain Sources, Instances, Boards, and Widgets
   through typed CLI operations that share the application's business rules.
5. Make every derived result traceable to its inputs, observation coverage,
   transformations, and limitations.
6. Keep permission changes, secrets, destructive operations, and executable
   code under explicit and understandable user control.

## Target Users and Actors

### Board user

A person following a subject over time. They want current information to remain
easy to browse and expect personalized processing to update without repeatedly
rebuilding the research workflow.

### Power user or Source author

A person who configures or authors Sources, inspects raw results, understands
coverage limitations, and may promote useful Widgets or Board configurations
into reusable templates.

### Agent

A first-class application actor operating through the CLI. The Agent translates
user intent into inspectable application changes, but it does not receive
broader permissions than the user has granted and does not bypass canonical
Actions, Queries, validation, or persistence.

## Scope and Priority

Priority describes product sequencing, not implementation status.

| Priority | Scope | Outcome |
| --- | --- | --- |
| P0 | Preserve the unified Now Layer Card contract | Every Instance remains independently readable and operable |
| P0 | Durable Next Layer Widget and layout model | A Board can save personalized Widget composition |
| P0 | Multi-Instance Widget inputs | One Widget can combine any selected Board data streams |
| P0 | Widget CLI discovery, preview, and mutation | An Agent can fully manage Next Layer |
| P0 | Provenance, dependency, loading, and failure state | Derived results remain inspectable and trustworthy |
| P0 | No duplicate Source execution for presentation | Both Layers reuse canonical Instance results |
| P1 | Agent-managed Source draft-to-install workflow | An Agent can establish missing stable data streams |
| P1 | Stream scheduling, health, versioning, and repair | Installed streams remain maintainable over time |
| P1 | Typed transformations and reusable derived data | Widget logic can be composed without repeated ad hoc work |
| P1 | Widget and Board templates | Useful solutions can be reused without fixing the possibility space |
| P2 | Restricted TypeScript and React Code Widgets | The Agent can implement presentations beyond declarative renderers |

## Product Principles

### The Board is the product surface

A Board represents a subject the user wants to follow, such as an industry, a
company, a technology, a market, or a personal research question. It is the
long-lived place where configured Sources feed two complementary views.

Users should experience one coherent Board, not a collection of temporary
agent-generated applications.

### One Board has two views

Now Layer and Next Layer are two complementary views of the same Board:

- Now Layer shows the news currently returned by the Board's Source Instances.
  Each Instance keeps its data separate and is projected through its own Card
  using the shared Card model.
- Next Layer processes those news items and, when relevant, their saved
  observations. One Widget can consume one, several, or all of the Board's
  Instance data streams and turn them into one personalized result.

The Layers therefore have intentionally different product contracts:

```text
Now Layer: unified Cards
Next Layer: personalized Widgets
```

Source-specific metadata and item templates may vary the content shown inside a
Card, but they must not replace the shared Now Layer Card model. Next Layer is
where presentation and processing can diverge for a particular purpose.
Each custom Board persists whether Now or Next opens by default. Switching the
active view never creates another Board or changes its underlying data.

### Independent in Now, composable in Next

Now Layer preserves Source boundaries. It does not merge the result of one
Instance into another Instance's Card. This keeps provenance, status, settings,
and direct reading understandable.

Next Layer can cross those boundaries. A Widget may correlate, validate, fuse,
reconcile, transform, summarize, simulate, visualize, or otherwise use any
combination of Board data. These are examples, not a closed taxonomy. The
product contract is the ability to select data streams, compute a derived
result, and express it as a Widget; the Agent and user can continue inventing
new purposes without requiring NewsNext to predefine each one.

Cross-stream processing must retain the identity and provenance of every input.
A reconciled or corrected value is derived data: it must record how it was
produced and must not silently rewrite the original Source result or historical
observation.

Next Layer depends on the news available to the Board. It is not an independent
Board, a second data-collection path, or a standalone generated application.
Moving between Layers must preserve the current Board identity and context.

### Stable data streams are the foundation

A configured Source Instance produces a recurring stream of normalized results
and saved observations. Stability means that the stream has a durable identity,
repeatable configuration, visible provenance, observable health, and useful
history. It does not imply that every remote source is continuously available
or that every returned list is complete.

Persistent streams enable questions that a one-time search cannot reliably
answer:

- What appeared for the first time?
- What is missing from the latest observation?
- Which fields or positions changed?
- How did a subject develop over time?
- Which result is unusual relative to the available history?

### Agent and human actions share one model

The Agent must use the same Sources, Instances, Collections, observations,
Actions, and Queries as the human interface. Agent automation must not create a
parallel Board model or bypass application validation, permissions, or
persistence rules.

### Collection and processing remain separate

Sources collect and normalize data. Widgets process, query, and present that
data in Next Layer. A Widget must not hide an independent web crawler inside
its rendering code. When a Widget exposes a data gap, the Agent should create
or revise a Source instead.

### Claims remain auditable

Summaries, trends, and forecasts must retain links to their input datasets,
observation windows, transformations, and limitations. Observation time is not
publication time, position does not necessarily represent popularity, and an
item missing from a partial result is not proven to have been deleted.

## Product Model

```text
User goal
    |
    v
Board
    |
    +-- Data foundation
    |      +-- Source Instances
    |             +-- Stable data streams
    |                    +-- current news
    |                    +-- observations and changes
    |
    +-- Experience
           +-- Now Layer
           |      +-- Instance A -> Card A
           |      +-- Instance B -> Card B
           |      +-- Instance C -> Card C
           |
           +-- Next Layer
                  +-- Widget inputs
                  |      +-- Instance A
                  |      +-- Instance B
                  |      +-- Instance C
                  |      +-- observations, changes, and derived data
                  +-- personalized Widget <- combined inputs

Agent: creates, connects, evaluates, and maintains every stage through the CLI.
```

The canonical concepts remain:

| Concept | Product role |
| --- | --- |
| Source | Reusable definition of how to acquire and normalize data |
| Instance | Configured Source with a durable dataset identity |
| Observation | A saved result from an Instance at a known observation time |
| Collection | Durable organization of Instances |
| Board | Human presentation of a Collection through Now Layer and Next Layer |
| Now Layer | Separate Instance results presented through a unified Card model |
| Next Layer | Open composition of Board data through personalized Widgets |
| Card | Shared Now Layer model for reading and operating one Source Instance |
| Widget | Personalized result computed from one or more Board data streams |
| Agent | CLI user that operates the same application capabilities as the UI |

## Core User Jobs

### Establish a subject to follow

The user describes what they want to keep understanding. The Agent creates or
selects a Board, finds existing Sources, identifies missing coverage, configures
Instances, and explains the resulting data scope.

### Turn an investigation into a stable stream

The user or Agent may begin with an exploratory fetch or local Source run. A
useful exploration can progress through explicit lifecycle states:

```text
One-time exploration -> Source draft -> validated Source -> installed Source
                     -> configured Instance -> observed stable stream
```

An incidental question must not silently create permanent background work,
request new permissions, or retain unnecessary data.

### Understand current information

The user can browse each Instance's latest news independently in Now Layer
through one consistent Card model. This default reading experience remains
predictable without requiring an Agent-generated Widget or custom interface.

### Understand change

In Next Layer, the user can track arrivals, missing items, ranking movement,
field changes, cross-source coverage, and other facts supported by stored
observations.

### Create a purpose-specific view

The user asks a question in natural language. The Agent selects any relevant
combination of Board data and creates or updates a personalized Next Layer
Widget to process and express it. The result stays within the same Board and
continues to update with its dependencies.

### Improve coverage from analysis

A Widget or analysis may reveal missing evidence. The Agent can propose an
additional Source, a parameter change, a revised collection frequency, or the
retirement of an unhelpful stream. This creates a feedback loop:

```text
Source -> observations -> Widget -> insight -> data gap -> Source
   ^                                                     |
   +------------- quality evaluation and repair --------+
```

## Agent Requirements

### Capability discovery

The CLI must expose machine-readable catalogs and schemas for available
Sources, Actions, Queries, Widget types, and data transformations. The Agent
must be able to inspect existing Board context before making changes.

### Source creation and maintenance

The Agent must be able to:

- Search existing Sources before authoring a duplicate.
- Create a local Source draft using supported authoring primitives.
- Run the draft against the extension runtime and inspect normalized output.
- Validate parameters, item fields, identities, pagination, declared domains,
  capabilities, security limits, and required secrets.
- Receive a structured quality report suitable for iterative repair.
- Request approval for new host permissions, secrets, or materially expanded
  collection scope.
- Install or register an approved Source and configure an Instance on a Board.
- Observe run health and diagnose or propose repairs when the stream fails.
- Preserve Source versions and identify which Instances and Widgets depend on
  them.

Source validation should report more than syntax success. It should make
missing fields, unstable identities, duplicates, incomplete pagination,
unexpected result sizes, permission requirements, and potentially sensitive
responses visible to the Agent and user.

### Board operation

The Agent must be able to create, inspect, update, and organize Collections and
their Board presentation through canonical application Actions and Queries. It
must preserve the relationship between each Board's Now Layer and Next Layer.
It must also preserve the unified Card contract in Now Layer while personalizing
Widgets in Next Layer. All operations must use stable Data identities rather
than display labels.

### Widget creation and maintenance

The Agent must be able to:

- Inspect the datasets and fields available to a Board.
- Add, configure, reorder, update, and remove Widgets.
- Bind a Widget to one or more current Instance results, observation ranges, or
  derived datasets without duplicating Source execution.
- Combine data across Instance and Source boundaries while preserving the
  identity, contribution, and limitations of every input.
- Define new transformations and presentations instead of being limited to a
  fixed catalog of analysis modes.
- Preview a Widget before saving it to the Board's Next Layer.
- Explain the Widget's dependencies, transformations, refresh behavior, and
  unsupported assumptions.
- Detect broken dependencies and revise the Widget or its Sources.

Widgets should support two levels of extensibility:

1. Declarative Widgets use trusted built-in renderers and typed configuration.
2. Code Widgets use a restricted TypeScript and React runtime for presentations
   that cannot be expressed with built-in renderers.

Declarative Widgets are the default. Repeatedly useful custom configurations or
code Widgets should be promotable into reusable templates. Code Widgets must
not receive unrestricted extension, browser, filesystem, credential, or
network access.

### Analysis and claims

The Agent may use the Board's data for any processing that fits the Widget
runtime and safety boundaries. Organizing, tracking, cross-validating, fusing,
reconciling, explaining, discovering, forecasting, and recommending actions are
examples rather than an exhaustive capability list. Every derived claim must
expose its evidence scope. Forecasts must additionally show assumptions,
uncertainty, confidence, and the new evidence that could change the assessment.

## Example Widget Possibilities

Next Layer is intentionally open-ended. The following categories illustrate
what stable, composable data streams make possible; they do not define the
limits of the Widget model. Widget logic, selection, configuration, layout, and
derived results may differ by Board and user:

| Job | Example Widgets |
| --- | --- |
| Organize | Topic groups, entities, reading queue, event timeline |
| Track | New and missing items, field changes, ranking movement, status tracker |
| Compare | Source comparison, product matrix, evidence table, period comparison |
| Validate | Corroboration, contradiction detection, confidence assessment |
| Fuse | Unified event, entity, topic, or multi-source result |
| Reconcile | Normalized fields, conflict resolution, corrected derived view |
| Explain | Change summary, evidence-backed answer, disagreement summary |
| Discover | Emerging topics, cross-source matches, anomalies, related entities |
| Forecast | Trend projection, scenarios, probability range, leading indicators |
| Simulate | What-if model, sensitivity analysis, alternative scenarios |
| Act | Alert, recurring report, investigation queue, proposed Source change |

Next Layer is the programmable processing layer for these and as-yet-unimagined
Widgets. Its current mixed timeline is one built-in organization of the news,
not the definition of the Layer. Now Layer keeps Instance results separate in
unified Cards; Next Layer owns open-ended composition, derived processing, and
personalized presentation. Both must reuse the same Board Instance results and
must not create duplicate Source subscriptions solely for presentation.

## Permissions, Safety, and Control

Agent autonomy must not obscure material changes. The following operations
require explicit user approval:

- Granting a new host permission.
- Adding or exposing a secret.
- Expanding collection to materially different domains or private data.
- Installing executable or code-based Source logic from an untrusted origin.
- Enabling a code Widget with capabilities beyond its existing sandbox.
- Deleting a Board, Source, Instance, history, or other durable user data.

Low-risk changes that stay within existing permissions, such as repairing a
selector or correcting a field mapping, may be automated when the user has
enabled maintenance for that stream. Every automated change must remain
versioned, inspectable, and reversible.

The product must show, for each stable stream:

- Why it exists and which Board goal it serves.
- Its Source, normalized parameters, domains, permissions, and secrets used.
- Its latest success, latest failure, and relevant completeness warnings.
- Its Source version and configuration history.
- Its dependent Boards and Widgets.

## Current State and Gaps

The implemented application is the baseline for this PRD. A target requirement
must not be described to users as available until its acceptance criteria pass.

| Area | Status | Implemented baseline | Primary gap |
| --- | --- | --- | --- |
| Source definitions | Implemented foundation | Registry providers, parameters, metadata, loaders, transforms, templates, Radar rules, capabilities, secrets, and security limits | Agent-oriented draft, quality report, installation, and version lifecycle |
| Source execution | Implemented foundation | Registered and local Sources can run through the extension runtime and CLI; direct extension-backed fetch supports debugging | Durable scheduling, health policy, and automatic maintenance |
| Instance and Collection data | Implemented | Canonical Instances, Collections, membership, manual order, and Board view preferences | No material data-model gap for the first Widget phase |
| UI and Agent control | Implemented foundation | UI and CLI use the same typed Actions and Queries and the same background persistence boundary | Widget and Source-lifecycle operations are not exposed yet |
| Now Layer | Implemented | Each Instance is independently presented as a Card using the unified Card model | Preserve this contract while Next Layer evolves |
| Next Layer | Partial | One shared mixed Timeline reorganizes current Board results and reuses the Now Layer query path | No durable Widget, layout, personalization, or Agent management model |
| History | Implemented foundation | Successful observations can be listed, read at an exact time, and compared for added, missing, position, and top-level field changes | No general derived-data contract or Widget binding contract |
| Provenance | Partial | Source and Instance identities remain stable; history comparisons preserve supported factual boundaries | Derived Widget inputs, transformations, warnings, and claims need an explicit UI contract |
| Code Widgets | Not implemented | None | Sandbox, resource limits, versioning, preview, failure isolation, and rollback |

The current CLI includes these relevant control surfaces:

```sh
bun run newsnext run <source-or-provider>
bun run newsnext fetch <url>
bun run newsnext action list
bun run newsnext action execute <action> --input '<json>'
bun run newsnext query list
bun run newsnext query execute <query> --input '<json>'
bun run newsnext history datasets
bun run newsnext history observations <instance-id>
bun run newsnext history get <instance-id> <time>
bun run newsnext history compare <instance-id> <from> <to>
```

The implemented history comparison reports only directly supported facts. An
item marked `missing` is not necessarily deleted, observation time is not
publication time, and position alone does not establish popularity or cause.

The remaining product gaps are:

- A durable Widget model and Next Layer layout model.
- Multi-Instance Widget inputs with explicit provenance and dependency state.
- CLI discovery and mutation APIs for Widgets.
- Source draft, validation-report, installation, versioning, and dependency
  workflows suitable for Agent operation.
- Stream scheduling, health, maintenance policy, and user-visible diagnostics.
- Derived dataset and transformation contracts.
- Safe execution boundaries for code Widgets, if and when they are introduced.
- Provenance and evidence presentation for Agent-generated analysis.

## Functional Requirements and Acceptance Criteria

### Board and Layer requirements

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| BRD-01 | A Board exposes Now Layer and Next Layer as two views of one Collection context | Switching Layers preserves the Board identity, route context, and selected Collection |
| BRD-02 | Both Layers consume canonical Instance state | Opening or rendering Next Layer does not create a second Instance or presentation-only Source execution |
| BRD-03 | Board deletion and other destructive changes remain explicit | The UI or Agent receives confirmation before durable Board data is deleted |
| BRD-04 | A Board persists its default View | Reopening a custom Board starts in its saved Now or Next View without changing its Collection or Instance data |

### Now Layer requirements

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| NOW-01 | One Instance is shown through one independent Card placement in a Board | Items from another Instance are never merged into that Card's result |
| NOW-02 | All Sources use the shared Card model | Source metadata and item templates can vary content, but shared Card identity, status, configuration, and interactions remain available |
| NOW-03 | Next Layer personalization does not mutate Now Layer structure | Adding, editing, moving, or deleting a Widget leaves Now Layer Card composition unchanged |

### Next Layer and Widget requirements

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| NXT-01 | A Board persists its Next Layer Widget composition | Widget identity, type, configuration, position, size, and dependencies survive extension restart |
| NXT-02 | A Widget can consume one, several, or all Board Instances | The saved input specification uses stable Instance identities and rejects unavailable or out-of-scope inputs |
| NXT-03 | A Widget can consume current results, observation ranges, and supported derived data | Each input declares its kind, dataset scope, time scope, and completeness state |
| NXT-04 | A Widget can create an open-ended derived result | The runtime is extensible beyond the initial built-in categories without changing the Board or Now Layer data model |
| NXT-05 | A Widget exposes provenance | The user or Agent can inspect input Instances, observation window, transformation version, warnings, and last computation time |
| NXT-06 | A Widget isolates failures | One failed transformation or renderer exposes a local error state and does not prevent other Cards or Widgets from working |
| NXT-07 | Corrected or reconciled values remain derived | Widget processing never silently changes stored Source results or historical observations |
| NXT-08 | Widgets expose useful runtime states | Empty, loading, stale, partial, failed, and ready states are distinguishable and accessible |
| NXT-09 | Widget layout is personalized without becoming a separate Board | The layout belongs to the current Board's Next Layer and retains its underlying Collection identity |

### Agent and CLI requirements

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| AGT-01 | The Agent can discover Widget capabilities | The CLI returns stable operation names, descriptions, and machine-readable input and output schemas |
| AGT-02 | The Agent can inspect Board data before authoring a Widget | Queries expose the current Board, available Instances, fields, observations, existing Widgets, and dependency health |
| AGT-03 | The Agent can preview before persistence | A preview returns the proposed result, provenance, warnings, and resource failures without modifying the Board |
| AGT-04 | The Agent can create, update, order, and delete Widgets | CLI changes use canonical Actions, validate at runtime, persist once, and propagate to open UI pages |
| AGT-05 | Agent changes are inspectable | Each durable Agent-created Source or Widget records its origin, version, configuration, and update time |
| AGT-06 | The Agent reuses existing capabilities | Before creating a Source or equivalent derived dataset, discovery can identify an existing suitable Source, Instance, transformation, or template |

### Source lifecycle requirements

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| SRC-01 | The Agent can create a Source draft | Draft creation does not install the Source, request permission, or create durable background work |
| SRC-02 | Validation returns a structured quality report | The report covers syntax, fields, stable identity, duplicates, pagination, domains, permissions, secrets, result size, and security limits where applicable |
| SRC-03 | Installation is an explicit promotion | Only a validated and approved draft can become an installed Source and configured Instance |
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

## Experience Requirements

### Layer navigation

- Now Layer and Next Layer must feel like two views of the current Board, not
  two destinations with unrelated state.
- Layer switching must preserve the Board, avoid unnecessary data refetching,
  and make the active Layer apparent to keyboard and assistive-technology users.
- Each custom Board can persist Now or Next as the View that opens by default.
- Now Layer remains immediately useful even when no Widget has been configured.
- An empty Next Layer should explain its purpose and offer Agent-assisted or
  manual Widget creation without inventing permanent data work silently.

### Widget creation

- The user may begin from a goal, a built-in Widget, an existing template, or a
  blank configuration.
- Before saving, the product must show which Board data the Widget will use and
  whether it requires new Sources, permissions, or retained derived data.
- A preview must distinguish a successful result with warnings from a complete
  failure.
- Saving a Widget must not imply approval for unrelated Source, permission, or
  secret changes.

### Widget inspection

- Every Widget must have an accessible path to its input, freshness,
  provenance, transformation, and failure details.
- Derived results should link back to supporting items or observations whenever
  the result type permits it.
- Users must be able to tell whether they are reading observed data, an Agent
  interpretation, a reconciled value, or a forecast.

### Editing and recovery

- Widget edits should be previewable and cancelable before persistence.
- A broken Widget must remain editable or removable.
- Reusable templates must not create shared mutable state between Boards;
  applying a template creates a Board-owned Widget configuration.
- Code Widget updates require version history and rollback before they can be
  treated as durable.

## Non-Functional Requirements

### Performance

- Next Layer must reuse the current canonical Instance results instead of
  subscribing to or executing every Source again.
- Widget computation must be incremental or bounded so one expensive Widget
  cannot block interaction with the Board.
- Long lists and timelines must remain virtualized where rendering cost would
  otherwise grow with the full result set.
- Hidden Widgets must not create unnecessary time, query, or rendering
  subscriptions.

### Reliability

- Stable identities must survive display-name, layout, and presentation
  changes.
- Widget persistence must be atomic at the application Action boundary.
- A renderer or transformation failure must be isolated to the affected
  Widget.
- Installed Source and Code Widget changes must be versioned before automated
  maintenance or rollback is enabled.

### Security and privacy

- Widget renderers receive only declared data and capabilities.
- Code Widgets must run inside a restricted environment with explicit CPU,
  memory, time, storage, and output limits.
- Widgets cannot read secrets directly or perform undeclared network requests.
- Logs, previews, and validation reports must avoid persisting sensitive
  response bodies unless the user explicitly requests diagnostic retention.

### Accessibility

- Layer controls, Widget actions, loading and error states, and generated
  visualizations must remain keyboard operable and expose semantic labels.
- A visual encoding must not be the only way to communicate provenance,
  confidence, state, or failure.
- Code Widgets must satisfy the same accessibility contract as built-in
  Widgets before they can be saved without a warning.

### Compatibility and maintainability

- Widget, transformation, and Source schemas require explicit versions and
  migration paths.
- The CLI and frontend must consume the same canonical schemas and operations.
- Built-in Widgets and Agent-created Widgets must use the same data input and
  provenance contracts wherever their capabilities overlap.

## Delivery Strategy

Phase 1 is the minimum product increment for the new Next Layer model. Later
phases expand how data streams are created and what Widgets can compute without
changing the two-Layer Board contract.

### Phase 1: Agent-composable built-in Widgets

- Define the durable Widget schema and its relationship to a Collection's Board
  and Next Layer.
- Preserve Now Layer as the unified Card experience for current news.
- Treat the existing Next Layer mixed timeline as a built-in Widget.
- Add built-in organization, comparison, change, and summary Widgets to Next
  Layer.
- Allow a Widget to consume and derive results from any selected combination of
  Board Instances.
- Allow each Board and user to personalize Next Layer Widget selection,
  configuration, and layout without changing Now Layer's Card model.
- Expose Widget discovery, preview, and mutation through canonical CLI
  operations.
- Bind Widgets to existing current results and history without duplicate Source
  execution.

Phase 1 exits when the P0 scope and `BRD-*`, `NOW-*`, `NXT-*`, `AGT-01` through
`AGT-04`, and applicable `PRV-*` requirements pass end-to-end through both the
UI and CLI.

### Phase 2: Agent-managed stable streams

- Formalize Source draft and validation-report formats.
- Let the Agent move a tested Source through review, installation, Instance
  creation, and Board membership.
- Add stream scheduling, health state, dependency inspection, versioning, and
  permission-aware repair workflows.
- Let Widget analysis propose coverage changes without silently applying
  material permission or retention changes.

Phase 2 exits when `SRC-*`, `AGT-05`, and `AGT-06` pass with permission review,
health inspection, failed-run diagnosis, and rollback demonstrated on at least
one declarative and one TypeScript-backed Source.

### Phase 3: Derived data and reusable intelligence

- Add typed transformations and reusable derived datasets.
- Add evidence-backed explanation, discovery, recurring report, and forecast
  Widgets.
- Promote successful configurations into reusable Board and Widget templates.

Phase 3 exits when a derived dataset can be reused by multiple Widgets, retains
complete provenance, and survives schema migration without changing original
observations.

### Phase 4: Restricted code Widgets

- Introduce code Widgets only after declarative Widgets, data contracts,
  provenance, resource limits, and sandbox boundaries are stable.
- Provide preview, failure isolation, versioning, and safe rollback.

Phase 4 exits only after capability denial, resource exhaustion, renderer
failure, upgrade, and rollback scenarios are verified without exposing secrets,
performing undeclared requests, or breaking unrelated Board content.

## Success Criteria

The product direction is succeeding when:

- A user can describe a subject and obtain a useful Board without manually
  authoring every Source or Widget.
- Different Sources remain understandable through the unified Now Layer Card
  model.
- Each Now Layer Card continues to represent one Instance's independent result.
- Next Layer Widgets reflect the needs of the current Board and user rather than
  imposing one global processed view.
- One Next Layer Widget can combine several Instance streams without losing
  their provenance or rewriting their original observations.
- Users and Agents can create useful Widget behaviors that were not enumerated
  in the original built-in catalog.
- The resulting Board continues to update after the initial Agent session.
- Users can see where each result and derived claim came from.
- The Agent reuses an existing Source or Instance when it already provides the
  required data.
- Source failures and data-quality regressions are visible and repairable.
- New Widget types do not require duplicating collection logic or Source
  execution.
- A one-time exploration becomes permanent only through an explicit promotion
  and approval flow.
- Historical claims respect the actual observation coverage and completeness
  of the stored data.

## Measurement Plan

Targets should be set after instrumenting the implemented baseline. The PRD
defines what to measure before asserting numerical improvement.

| Measure | Definition | Desired direction |
| --- | --- | --- |
| Time to useful Board | Time from stated subject to a Board with working Instances and at least one useful Next Layer result | Down |
| Stream reuse rate | Share of Agent tasks satisfied by an existing Source or Instance instead of a duplicate | Up |
| Widget activation | Share of Boards with a saved Next Layer Widget used again after its creation session | Up |
| Multi-stream value | Share of retained Widgets that intentionally use more than one Instance | Observe, then increase where useful |
| Stream health | Share of scheduled runs that finish with valid normalized results, segmented by Source | Up |
| Repair recovery | Time from detected stream regression to restored valid output | Down |
| Provenance coverage | Share of derived Widget results with complete input, transformation, warning, and update metadata | Must reach 100% before broad release |
| Unauthorized authority changes | New permissions, secrets, destructive writes, or executable capabilities applied without required approval | Must remain zero |
| Duplicate presentation execution | Additional Source executions caused only by rendering Next Layer | Must remain zero |
| Widget failure containment | Widget failures that prevent unrelated Cards or Widgets from operating | Must remain zero |

Qualitative research should additionally test whether users understand:

- The difference between Now Layer and Next Layer.
- That a Card is one independent Instance while a Widget may combine many.
- Which parts of a Widget are observed facts versus derived interpretation.
- Why an Agent is requesting a new Source, permission, secret, or permanent
  background task.

## Dependencies and Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Open-ended Widgets become an unsafe arbitrary application runtime | Security, reliability, and maintainability regress | Start with typed declarative contracts; gate code execution behind a restricted sandbox and explicit capability review |
| Agent creates redundant or low-quality Sources | Noisy Boards, unnecessary requests, and fragile maintenance | Require discovery before creation, structured validation, explicit promotion, health reporting, and retirement suggestions |
| Cross-source fusion hides disagreement or provenance | Users trust an unsupported corrected result | Preserve every input identity, distinguish observed and derived values, and make reconciliation logic inspectable |
| Sparse observations are mistaken for continuous monitoring | Trend and forecast claims become misleading | Carry observation coverage and completeness warnings into every transformation and Widget |
| Widget computation harms extension performance | Board interaction becomes slow or unstable | Bound resources, isolate failures, virtualize long content, and avoid hidden subscriptions or duplicate Source execution |
| Personalization fragments the product into inconsistent mini-apps | Users lose the coherent Board mental model | Keep Now Layer unified, keep Widgets inside the Board's Next Layer, and standardize lifecycle, provenance, state, and accessibility contracts |
| Automatic repair expands authority unintentionally | Privacy or security boundary is crossed | Define maintenance grants narrowly and require approval for new domains, secrets, private data, executable logic, or destructive changes |
| Schema evolution breaks saved Widgets | Durable Boards stop rendering after upgrades | Version all durable schemas, provide migrations, retain failure-safe editing, and support rollback for executable logic |

The major implementation dependencies are the canonical application Action and
Query boundary, stable Instance and Collection identities, the source-history
repository, the Source runtime and permission model, and a versioned Widget
input and transformation contract.

## Non-Goals

- Replacing the Board with arbitrary standalone applications.
- Turning Now Layer into a second personalized Widget canvas.
- Limiting Next Layer to a fixed taxonomy of processing or visualization modes.
- Making generated UI the primary product differentiator.
- Allowing Widgets to perform undeclared collection or unrestricted network
  access.
- Treating one-time web search results as stable data streams.
- Claiming continuous monitoring when only intermittent observations exist.
- Presenting forecasts as facts or hiding their evidence and uncertainty.
- Creating a CLI-only copy of Board, Source, Instance, or Widget state.

## Open Product Questions

- What event or policy determines the refresh cadence of a stable stream?
- Which Source changes can an Agent apply automatically under a maintenance
  grant, and which always require review?
- Should Widget instances always belong to one Board's Next Layer while their
  definitions can be reused as templates across Boards?
- What is the minimal derived-data contract that supports comparison and
  analysis without becoming a general-purpose database?
- Which declarative Widget set is sufficient before code Widgets are justified?
- How should the product communicate sparse observation coverage in trend and
  forecast Widgets?
- When should the Agent recommend retiring a Source that is healthy but no
  longer contributes useful information?
