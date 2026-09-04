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

// Finds the ignition time (first point where thrust rises to/above the
// threshold) and burnout time (last point still at/above the threshold),
// using the same peak-thrust threshold convention as countUpwardCrossings.
// Returns null if no data point ever reaches the threshold.
export function findIgnitionAndBurnout(
  time: number[],
  thrust: number[],
  thresholdRatio = 0.05
): { ignition: number; burnout: number } | null {
  if (thrust.length === 0) return null

  const peak = Math.max(...thrust)
  const threshold = thresholdRatio * peak

  let ignitionIdx = -1
  for (let i = 0; i < thrust.length; i++) {
    if (thrust[i] >= threshold) {
      ignitionIdx = i
      break
    }
  }

  let burnoutIdx = -1
  for (let i = thrust.length - 1; i >= 0; i--) {
    if (thrust[i] >= threshold) {
      burnoutIdx = i
      break
    }
  }

  if (ignitionIdx === -1 || burnoutIdx === -1) return null

  return { ignition: time[ignitionIdx], burnout: time[burnoutIdx] }
}

// Builds an auto-trim range for a "clean" test (0 or 1 upward crossings):
// [ignition - paddingSeconds, burnout + paddingSeconds], clamped to the
// actual recorded data bounds. Returns null if ignition/burnout can't be
// determined (e.g. thrust never reaches the threshold).
export function autoTrimRange(
  time: number[],
  thrust: number[],
  paddingSeconds = 2,
  thresholdRatio = 0.05
): { start: number; end: number } | null {
  const result = findIgnitionAndBurnout(time, thrust, thresholdRatio)
  if (!result) return null

  const dataMin = time[0]
  const dataMax = time[time.length - 1]

  return {
    start: Math.max(dataMin, result.ignition - paddingSeconds),
    end: Math.min(dataMax, result.burnout + paddingSeconds),
  }
}
