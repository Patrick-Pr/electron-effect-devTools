export type MetricKind = "Counter" | "Gauge" | "Histogram" | "Summary" | "Frequency"

export interface MetricInfo {
  key: string
  value: string
}

export interface MetricRecord {
  id: string
  name: string
  kind: MetricKind
  description: string
  tags: MetricInfo[]
  details: MetricInfo[]
  defaultExpanded?: boolean
}
