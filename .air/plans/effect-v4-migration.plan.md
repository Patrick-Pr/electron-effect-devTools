# Goal

Migrate the Electron DevTools backend from Effect v3 to the published, exact Effect v4 RC `4.0.0-rc.117`, intentionally accepting only the v4 DevTools wire protocol while preserving all current renderer-facing snapshots, commands, and Electron IPC behavior.

# Approach

Align the Effect dependency graph first, then migrate the only Effect-heavy source module against the exact installed RC declarations and the official v3→v4 migration references. Replace removed package imports and generated service-layer behavior with v4-native imports, `Context.Service`, and an explicit scoped layer; then adapt v4 DevTools metric/span payloads at the backend boundary so no renderer contracts need to change. Resolve every remaining compiler error through the upstream migration map or v4 declarations—without compatibility wrappers, `any`, or type assertions used to suppress migration errors.

# File Changes

- **Modify** `package.json:21-31` — remove the consolidated v3 packages `@effect/experimental` and `@effect/platform`; pin both `effect` and `@effect/platform-node` to exact `4.0.0-rc.117`; leave unrelated dependencies and scripts unchanged.
- **Modify** `pnpm-lock.yaml` — regenerate the root importer and package graph from the updated manifest so the direct v3 packages disappear and the v4 core/platform packages resolve consistently.
- **Modify** `electron/backend/devtools-backend.ts:1-1008` — migrate imports, DevTools schema types, service construction/lifetime, queue/ref/cause operations, client sending, metric payload conversion, and optional event attributes to the v4 API while preserving the backend’s public behavior.
- **No create/delete** — keep `src/lib/contracts/*`, renderer components, `electron/main.ts`, the IPC bridge, and both reference submodules unchanged. Any local migration-reference checkout used during implementation is tooling-only and must not be committed.

# Implementation Steps

## Task 1: Establish the v4 dependency baseline

1. Before source edits, validate an authoritative v4 reference per the migration workflow: use the official Effect migration index/reference and inspect the exact `4.0.0-rc.117` package declarations after installation. Use the bundled `submodules/effect` checkout only for v3 semantics because it is currently Effect `3.21.0`, not as the v4 API authority.
2. In `package.json:21-31`, delete direct dependencies `@effect/experimental@0.60.0` and `@effect/platform@0.96.0`; change `effect@3.21.0` and `@effect/platform-node@0.106.0` to exact `4.0.0-rc.117`.
3. Run `pnpm install` to regenerate `pnpm-lock.yaml`. Inspect `pnpm why effect`, `pnpm why @effect/platform-node`, `pnpm why @effect/experimental`, and `pnpm why @effect/platform`; distinguish removed direct dependencies from any legitimate transitive dependencies instead of editing the lockfile manually.
4. Run `pnpm check` once to capture the actual v4 compiler-error inventory. Use that inventory to drive the remaining edits.

## Task 2: Migrate imports and scoped service construction

1. In `electron/backend/devtools-backend.ts:1-11`, replace:
   - `@effect/experimental/DevTools/Server` with `effect/unstable/devtools/DevToolsServer`.
   - `@effect/experimental/DevTools/Domain` with `effect/unstable/devtools/DevToolsSchema`.
   - `@effect/platform/SocketServer` with `effect/unstable/socket/SocketServer`.
   - Retain the v4 `@effect/platform-node/NodeSocketServer` import and add the v4 modules required for `Context`, `Layer`, and direct `Queue` operations.
2. Update the internal protocol types at `electron/backend/devtools-backend.ts:20-42`, `:159-212`, and `:592-789` from the old `Domain` namespace to the exact `DevToolsSchema` types exposed by RC.117. Rename the stored client callback from `request` to `send`, type it from the v4 response type, and initialize it from `DevToolsServer.Client.send`.
3. Replace `Effect.Service(..., { scoped })` at `electron/backend/devtools-backend.ts:58-368` with `Context.Service(..., { make })`. Define an explicit `Layer.scoped` layer from the service’s constructor so the three `FiberHandle` allocations stay alive for the managed runtime and are finalized on disposal.
4. At `electron/backend/devtools-backend.ts:126-146`, `:212-230`, `:254-330`, and related compiler-reported call sites, migrate renamed/changed APIs:
   - `Effect.catchAllCause` → `Effect.catchCause`.
   - `Cause.isInterruptedOnly` → `Cause.hasInterruptsOnly`.
   - `client.queue.take` → `Queue.take(client.queue)`.
   - `stateRef.changes` → `SubscriptionRef.changes(stateRef)`.
   - Route metrics requests through the renamed `client.send`.
   Confirm retained APIs such as `FiberHandle.run/clear`, `Deferred`, `SubscriptionRef.modify`, `Stream.runForEach`, and `Cause.pretty` against the exact RC declarations before changing them.
5. At `electron/backend/devtools-backend.ts:370-447`, construct `ManagedRuntime` from the explicit service layer instead of the removed generated `.Default` layer. Preserve subscription startup, command dispatch, synchronous latest-snapshot refresh after commands, and `dispose()` semantics.

## Task 3: Adapt the v4 wire model at the backend boundary

1. Keep `applyClientMessage` at `electron/backend/devtools-backend.ts:592-627` dispatching the existing `MetricsSnapshot`, `Span`, and `SpanEvent` cases, but update the request union and payload types to v4 `DevToolsSchema`.
2. Rewrite `toMetricRecord` at `electron/backend/devtools-backend.ts:650-721` for the RC.117 metric representation:
   - Discriminate and display with `metric.type` instead of `metric._tag`.
   - Use `metric.id` for the renderer record’s existing `id` and `name`.
   - Convert optional `metric.attributes` records into the existing `MetricRecord.tags` array and derive `unit` / `time_unit` suffixes from those attributes.
   - Iterate frequency occurrences as a `ReadonlyMap`, sorting entries by key before producing details.
   - Treat summary quantile values as `number | undefined`, retaining the existing zero fallback for missing values.
   - Preserve current counter, gauge, frequency, histogram, and summary descriptions/details, including bigint formatting.
3. Update span/schema annotations throughout `electron/backend/devtools-backend.ts:723-909` to v4 types. In the event projection at `:838-843`, normalize omitted event attributes to an empty record before `Object.entries`; continue ignoring the ended-span `exit` field because the renderer contract only consumes timing, hierarchy, labels, and attributes.
4. Preserve `formatServerStartError` at `electron/backend/devtools-backend.ts:1001-1008`, including `Cause.pretty` output and the specialized `EADDRINUSE` message.

## Task 4: Close the compiler inventory and verify

1. Re-run `pnpm check` after each coherent migration slice. For each remaining Effect error, search the official `migration/v3-to-v4.md` by exact symbol, then inspect the relevant topic guide and RC.117 declaration/source. Do not introduce a v3 compatibility module, `any`, or a type assertion merely to silence an error.
2. Search root source and the manifest for removed imports/APIs:
   `rg -n '@effect/(experimental|platform)(/|")|Effect\\.Service|catchAllCause|isInterruptedOnly|\\.queue\\.take|stateRef\\.changes' electron package.json`.
   The search must return no matches; `@effect/platform-node` is intentionally valid and is not matched by this expression.
3. Once type-checking is clean, run `pnpm build`.
4. Run `pnpm install --frozen-lockfile` as the reproducibility check after the lockfile has been regenerated.
5. Start `pnpm dev` and perform the live v4 protocol smoke test described below. Do not add a test framework solely for this migration; the repository currently has no root automated test suite.

# Acceptance Criteria

- `package.json` contains exact `4.0.0-rc.117` entries for `effect` and `@effect/platform-node`, with no direct `@effect/experimental` or `@effect/platform` entry.
- `pnpm install --frozen-lockfile` exits 0 after regeneration; `pnpm why effect` and `pnpm why @effect/platform-node` show the root packages on the intended v4 RC.
- The removed-import/API `rg` command returns no matches in `electron` or `package.json`.
- `pnpm check` exits 0 for both the renderer and Electron TypeScript configurations.
- `pnpm build` exits 0 and emits the existing renderer and Electron outputs.
- Starting the backend reports `Server listening on port 34437`; a deliberate second listener on 34437 produces the existing specialized port-in-use error.
- A v4 DevTools client appears, is auto-selected when appropriate, can be selected/disconnected/removed, and becomes disconnected after the existing 10-second stale timeout when traffic stops.
- Metrics polling and reset work for the active connected client; snapshots render counter, gauge, frequency, histogram, and summary metrics with IDs, attributes, values, map-backed frequency details, undefined quantiles, and bigint values.
- Span and span-event payloads populate the tree and timeline; an event with omitted attributes renders with an empty attributes list and does not throw.
- Server stop and backend disposal clear server, metrics-polling, and stale-sweep fibers and restore the existing disabled snapshot state.
- The renderer contract files and IPC surface are unchanged.
- Effect v3 clients are not required to connect; v4-only protocol support is intentional.

# Verification Steps

1. Dependency/reproducibility:
   - `pnpm install`
   - `pnpm why effect`
   - `pnpm why @effect/platform-node`
   - `pnpm why @effect/experimental`
   - `pnpm why @effect/platform`
   - After all changes: `pnpm install --frozen-lockfile`
2. Static checks:
   - `rg -n '@effect/(experimental|platform)(/|")|Effect\\.Service|catchAllCause|isInterruptedOnly|\\.queue\\.take|stateRef\\.changes' electron package.json`
   - `pnpm check`
   - `pnpm build`
3. Live protocol test:
   - Run `pnpm dev`.
   - Connect an Effect v4 DevTools client to `ws://127.0.0.1:34437`.
   - Emit one span with an event and snapshots covering all five supported metric variants.
   - Verify client selection, metrics polling/reset, tracer/timeline reset, disconnect/remove, reconnect, and stale timeout.
4. Edge cases:
   - Event with no attributes.
   - Summary quantile with `undefined`.
   - Bigint counter/gauge values.
   - Frequency map with multiple unsorted keys.
   - Server stop/start and backend disposal.
   - Port collision on 34437.
5. Report the final `pnpm check`, `pnpm build`, frozen install, and live smoke-test outcomes honestly, including any environment limitation that prevents a manual case from being exercised.

# Risks & Mitigations

- **RC import/path volatility:** The targeted release exposes DevTools and socket functionality under `effect/unstable/*`. Pin both Effect packages exactly to RC.117 and validate imports against that installed artifact, not newer main-branch source alone.
- **v4 protocol incompatibility:** Metric fields/containers and the server client callback differ from v3. Treat this as an intentional v4-only boundary and translate payloads once in `devtools-backend.ts`; do not add a dual-protocol compatibility facade.
- **Scoped lifetime regression:** A plain effect layer could release or leak the three `FiberHandle` resources. Build the service with `Layer.scoped` and explicitly test stop/dispose.
- **Payload rendering drift:** Optional attributes, map-backed frequencies, undefined quantiles, and bigint values can cause subtle runtime failures despite successful compilation. Exercise each case in the live protocol smoke test.
- **Reference-version mismatch:** `submodules/effect` is the current v3.21.0 implementation reference and lacks v4 migration material. Use official migration docs plus the installed RC.117 declarations for v4 decisions; do not update reference submodules as part of this change.
- **No automated root test harness:** The repository has only type-check/build scripts. Use clean dual TypeScript checks, production build, frozen-lockfile install, and the live protocol matrix as the concrete verification gates rather than expanding scope with a new framework.