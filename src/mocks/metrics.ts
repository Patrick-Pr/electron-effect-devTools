import type { MetricRecord } from "../lib/contracts/metrics"

export const metrics: MetricRecord[] = [
  {
    id: "requests-total",
    name: "http.server.requests",
    kind: "Counter",
    description: "18,302 req",
    tags: [
      { key: "route", value: "/api/orders" },
      { key: "method", value: "GET" }
    ],
    details: [
      { key: "Count", value: "18,302" },
      { key: "Error ratio", value: "0.7%" }
    ]
  },
  {
    id: "latency-summary",
    name: "http.server.duration",
    kind: "Summary",
    description: "143 ms (p50)",
    tags: [
      { key: "route", value: "/api/orders" },
      { key: "unit", value: "ms" }
    ],
    details: [
      { key: "p50", value: "143 ms" },
      { key: "p90", value: "281 ms" },
      { key: "p99", value: "612 ms" },
      { key: "Count", value: "18,302" }
    ]
  },
  {
    id: "fiber-count",
    name: "effect.runtime.fibers",
    kind: "Gauge",
    description: "38 active",
    tags: [{ key: "service", value: "api-service" }],
    details: [
      { key: "Value", value: "38" },
      { key: "Peak", value: "74" }
    ]
  },
  {
    id: "mail-status",
    name: "mailer.status",
    kind: "Frequency",
    description: "2 statuses",
    defaultExpanded: true,
    tags: [{ key: "queue", value: "transactional" }],
    details: [
      { key: "sent", value: "1,802" },
      { key: "retry", value: "31" }
    ]
  }
]
