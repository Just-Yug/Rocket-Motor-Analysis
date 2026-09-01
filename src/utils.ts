// Counts only UPWARD crossings of a peak-thrust threshold (thrust rising from
// below the threshold to at/above it). Downward crossings are intentionally
// ignored — see SPEC.md §5 Calculations Reference for the rationale: a clean
// test has exactly one upward crossing (ignition); more than one indicates an
// anomaly such as a pre-ignition spike.
export function countUpwardCrossings(thrust: number[], thresholdRatio = 0.05): number {
  if (thrust.length < 2) return 0

  const peak = Math.max(...thrust)
  const threshold = thresholdRatio * peak

  let count = 0
  let wasBelow = thrust[0] < threshold

  for (let i = 1; i < thrust.length; i++) {
    const isBelow = thrust[i] < threshold
    if (wasBelow && !isBelow) {
      count++
    }
    wasBelow = isBelow
  }

  return count
}

// Returns the time/thrust arrays restricted to a trim range (inclusive).
// A null trimRange means "use the full data" — no trimming applied.
export function applyTrim(
  time: number[],
  thrust: number[],
  trimRange: { start: number; end: number } | null
): { time: number[]; thrust: number[] } {
  if (!trimRange) {
    return { time, thrust }
  }

  const filteredTime: number[] = []
  const filteredThrust: number[] = []

  for (let i = 0; i < time.length; i++) {
    if (time[i] >= trimRange.start && time[i] <= trimRange.end) {
      filteredTime.push(time[i])
      filteredThrust.push(thrust[i])
    }
  }

  return { time: filteredTime, thrust: filteredThrust }
}
