# Electron Effect DevTools

An unofficial standalone Electron interface for inspecting Effect applications. It recreates the core DevTools workflows of the [Effect VS Code extension](https://marketplace.visualstudio.com/items?itemName=effectful-tech.effect-vscode) in a dedicated desktop application.

This is an independent portfolio project. It is not affiliated with, endorsed by, or maintained by Effectful Technologies, and it is not intended to replace the official extension.

## Why this project exists

The project is primarily an experiment in agent-led software development: I wanted to explore how far I could take a cohesive, non-trivial application when coding agents perform much of the implementation and iteration under human direction, review, and verification.

The focus was the engineering workflow itself: defining product goals, supplying upstream references, reviewing generated changes, identifying security and usability gaps, and repeatedly tightening the result with automated checks. Transient internal agent plans are intentionally excluded from the current source tree; reusable agent skills remain alongside their upstream licenses.

## Current capabilities

- Discover and manage connected Effect DevTools clients.
- Inspect metrics and reset the active metrics snapshot.
- Browse spans as a tree or an interactive timeline.
- Pan, zoom, fit, expand, collapse, and inspect trace data with keyboard-accessible controls.
- Display Effect context, span stack, fibers, and breakpoint state through an authenticated local debug bridge.
- Run the renderer and backend with an isolated Electron preload boundary.

The context, fiber, and breakpoint views are experimental. Their authenticated bridge is implemented, but this repository does not yet ship the trusted debugger relay needed to attach those views to a real debug session automatically.

## Security model

The application is designed for local development. The Effect DevTools server listens only on `127.0.0.1:34437`, rejects browser-originated WebSocket connections, disables WebSocket compression, and limits individual messages to 1 MiB. The separate debug-session bridge listens on loopback port `34438` and requires a random per-launch WebSocket subprotocol credential.

Neither service is intended to accept connections from a LAN or the public internet.

## Getting started

Requirements:

- A current Node.js release supported by Electron and Vite.
- pnpm 10.28 or a compatible pnpm 10 release.

Install dependencies and start the development application:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

The reference submodules are useful when comparing behavior with the upstream projects, but they are not required to build the application. To fetch them:

```sh
git submodule update --init --recursive
```

## Verification

```sh
pnpm test
pnpm check
pnpm build
```

The test suite covers timeline geometry and state reconciliation, keyboard interactions, split-pane behavior, debug message validation, and the local WebSocket security policy.

## Project structure

- `electron/` contains the Electron main process, preload bridge, Effect DevTools server, and debug-session bridge.
- `src/features/` contains the clients, metrics, tracer, timeline, debug, and shell interfaces.
- `src/lib/contracts/` defines the renderer/backend command and snapshot contracts.
- `submodules/` contains upstream source references used to compare behavior and protocol details.

## Upstream work and licensing

The project uses the [Effect](https://github.com/Effect-TS/effect) packages and takes behavioral and interface references from the [Effect VS Code extension](https://github.com/Effect-TS/vscode-extension). Parts of the tracer interface were adapted from the extension under its MIT license. The checked-in frontend-design agent skill comes from Anthropic's public skills repository under Apache-2.0. See [Third-party notices](./THIRD_PARTY_NOTICES.md).

The original code in this repository is licensed under the [ISC License](./LICENSE).
