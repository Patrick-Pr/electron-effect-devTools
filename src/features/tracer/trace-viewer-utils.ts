import type { TraceEventRecord } from "../../lib/contracts/tracer"

interface TraceTimeBounds {
  startTime: number
  endTime: number
}

export function getTraceTimeBounds(traces: TraceEventRecord[]): TraceTimeBounds {
  if (traces.length === 0) {
    return { startTime: 0, endTime: 1 }
  }

  let startTime = traces[0].startTime
  let endTime = traces[0].endTime

  traces.forEach((trace) => {
    startTime = Math.min(startTime, trace.startTime)
    endTime = Math.max(endTime, trace.endTime)
  })

  if (endTime <= startTime) {
    endTime = startTime + 1
  }

  return { startTime, endTime }
}

export function clampViewTimeRange(
  startTime: number,
  endTime: number,
  bounds: TraceTimeBounds,
  minDuration = 1
) {
  const totalDuration = Math.max(bounds.endTime - bounds.startTime, minDuration)
  const duration = Math.max(minDuration, endTime - startTime)

  if (duration >= totalDuration) {
    return {
      startTime: bounds.startTime,
      endTime: bounds.startTime + totalDuration
    }
  }

  let nextStart = startTime
  let nextEnd = nextStart + duration

  if (nextStart < bounds.startTime) {
    nextStart = bounds.startTime
    nextEnd = nextStart + duration
  }

  if (nextEnd > bounds.endTime) {
    nextEnd = bounds.endTime
    nextStart = nextEnd - duration
  }

  return { startTime: nextStart, endTime: nextEnd }
}
