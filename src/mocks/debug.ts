import type { BreakpointRecord, ContextTagRecord, FiberRecord, SpanStackRecord } from "../lib/contracts/debug"

export const contextTags: ContextTagRecord[] = [
  {
    id: "ctx-logger",
    tag: "Logger",
    preview: "PrettyLogger",
    children: [
      { id: "ctx-logger-level", name: "minimumLogLevel", value: "Info" },
      { id: "ctx-logger-color", name: "colors", value: "true" }
    ]
  },
  {
    id: "ctx-config",
    tag: "AppConfig",
    preview: "{ env: production, region: eu-central-1 }",
    children: [
      { id: "ctx-config-env", name: "env", value: "production" },
      {
        id: "ctx-config-region",
        name: "deployment",
        value: "Object",
        isContainer: true,
        children: [
          { id: "ctx-config-region-name", name: "region", value: "eu-central-1" },
          { id: "ctx-config-region-stage", name: "stage", value: "canary" }
        ]
      }
    ]
  }
]

export const spanStack: SpanStackRecord[] = [
  {
    id: "span-auth",
    name: "Authorize request",
    stackIndex: 0,
    location: { path: "src/http/auth.ts", line: 88, column: 14 },
    attributes: [
      { id: "span-auth-user", name: "userId", value: "usr_2918" },
      { id: "span-auth-role", name: "role", value: "admin" }
    ]
  },
  {
    id: "span-routing",
    name: "Route match",
    stackIndex: 1,
    location: { path: "src/http/router.ts", line: 42, column: 8 },
    attributes: []
  },
  {
    id: "span-ignored",
    name: "FileSystem cache hydration",
    stackIndex: 2,
    ignored: true,
    attributes: []
  }
]

export const fibers: FiberRecord[] = [
  {
    id: "217",
    current: true,
    interrupted: false,
    interruptible: true,
    currentSpan: "Authorize request",
    tooltip: "src/http/auth.ts:88:14",
    startedAt: "Mar 30, 2026, 9:14:32 AM",
    lifetime: "4.2 s",
    attributes: [
      { id: "fiber-217-user", name: "userId", value: "usr_2918" },
      { id: "fiber-217-cache", name: "cacheHit", value: "false" }
    ],
    children: [
      {
        id: "218",
        current: false,
        interrupted: true,
        interruptible: false,
        interruptionRequested: true,
        currentSpan: "Fetch profile",
        tooltip: "src/services/profile.ts:131:5",
        startedAt: "Mar 30, 2026, 9:14:33 AM",
        lifetime: "3.8 s",
        attributes: [
          { id: "fiber-218-source", name: "source", value: "postgres" }
        ]
      }
    ]
  }
]

export const breakpointState: BreakpointRecord = {
  pauseOnDefects: true,
  values: [
    {
      id: "bp-cause",
      name: "cause",
      value: "Die(java.lang.IllegalStateException)",
      isContainer: true,
      children: [
        { id: "bp-cause-msg", name: "message", value: "Order aggregate became inconsistent" },
        { id: "bp-cause-span", name: "spanId", value: "span-order-44" }
      ]
    },
    { id: "bp-request-id", name: "requestId", value: "req_01JYV3CN7D" }
  ]
}
