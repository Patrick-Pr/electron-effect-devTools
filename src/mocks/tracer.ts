import type { TraceEventRecord, TraceSpanRecord } from "../lib/contracts/tracer"

export const tracerTree: TraceSpanRecord[] = [
  {
    id: "span-root-order",
    traceId: "trace_01JYV3B4QW",
    spanId: "span_01JYV3BF1D",
    name: "Handle order request",
    durationLabel: "612 ms",
    location: { path: "src/http/orders.ts", line: 54, column: 11 },
    attributes: [
      { id: "order-method", name: "method", value: "POST" },
      { id: "order-route", name: "route", value: "/api/orders" },
      { id: "order-tenant", name: "tenantId", value: "tenant_eu_12" }
    ],
    events: [
      {
        id: "span-root-validated",
        name: "payload validated",
        offsetLabel: "+18 ms",
        attributes: [{ id: "validated-fields", name: "fields", value: "4" }]
      }
    ],
    children: [
      {
        id: "span-auth-check",
        traceId: "trace_01JYV3B4QW",
        spanId: "span_01JYV3BF1E",
        name: "Authorize request",
        durationLabel: "143 ms",
        location: { path: "src/http/auth.ts", line: 88, column: 14 },
        attributes: [
          { id: "auth-user", name: "userId", value: "usr_2918" },
          { id: "auth-scope", name: "scope", value: "orders:write" }
        ],
        events: [],
        children: [
          {
            id: "span-external-auth0",
            traceId: "trace_01JYV3B4QW",
            spanId: "span_01JYV3BF1F",
            name: "External Span",
            durationLabel: "90 ms",
            attributes: [
              { id: "auth0-host", name: "host", value: "auth0.eu" }
            ],
            events: [],
            children: []
          }
        ]
      },
      {
        id: "span-db-order",
        traceId: "trace_01JYV3B4QW",
        spanId: "span_01JYV3BF1G",
        name: "Persist order aggregate",
        durationLabel: "331 ms",
        location: { path: "src/services/orders.ts", line: 201, column: 7 },
        attributes: [
          { id: "order-id", name: "orderId", value: "ord_871" },
          { id: "pool-name", name: "pool", value: "primary" }
        ],
        events: [
          {
            id: "span-db-write",
            name: "rows committed",
            offsetLabel: "+298 ms",
            attributes: [{ id: "rows-count", name: "rows", value: "3" }]
          }
        ]
      }
    ]
  }
]

export const traceEvents: TraceEventRecord[] = [
  { id: "span-root-order", name: "⌄ Handle order request", startTime: 0, endTime: 612, depth: 0, color: "#2f81f7" },
  { id: "span-auth-check", name: "⌄ Authorize request", startTime: 25, endTime: 168, depth: 1, color: "#238636" },
  { id: "span-external-auth0", name: "External auth provider", startTime: 52, endTime: 142, depth: 2, color: "#9e6cff" },
  { id: "span-db-order", name: "Persist order aggregate", startTime: 214, endTime: 545, depth: 1, color: "#db6d28" }
]
