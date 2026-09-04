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

// Trapezoidal numerical integration of thrust over time -> Total Impulse (N·s)
export function trapezoidalIntegral(time: number[], thrust: number[]): number {
  let total = 0
  for (let i = 1; i < time.length; i++) {
    const dt = time[i] - time[i - 1]
    total += 0.5 * (thrust[i] + thrust[i - 1]) * dt
  }
  return total
}

// Sustained-threshold ignition detection: a crossing only counts once thrust
// stays at/above the threshold continuously for minDurationSeconds. This
// prevents brief rig noise/transients from being mistaken for ignition.
// Default 50ms per SPEC.md §5. Burnout intentionally does NOT use this
// sustained check (see SPEC.md — the sustained requirement is specifically
// for ignition/burn-start detection).
export function findSustainedIgnition(
  time: number[],
  thrust: number[],
  thresholdRatio = 0.05,
  minDurationSeconds = 0.05
): number | null {
  if (thrust.length === 0) return null
  const peak = Math.max(...thrust)
  const threshold = thresholdRatio * peak

  for (let i = 0; i < thrust.length; i++) {
    if (thrust[i] < threshold) continue

    const targetTime = time[i] + minDurationSeconds
    let sustained = true
    let j = i
    while (j < thrust.length && time[j] <= targetTime) {
      if (thrust[j] < threshold) {
        sustained = false
        break
      }
      j++
    }

    if (sustained) return time[i]
  }

  return null
}

// Standard NAR/Tripoli impulse-class letter banding. Each class's upper
// bound doubles the previous one; returns the first class whose upper
// bound is >= the given Total Impulse.
const IMPULSE_CLASS_BANDS: { label: string; upper: number }[] = [
  { label: '1/4A', upper: 0.625 },
  { label: '1/2A', upper: 1.25 },
  { label: 'A', upper: 2.5 },
  { label: 'B', upper: 5 },
  { label: 'C', upper: 10 },
  { label: 'D', upper: 20 },
  { label: 'E', upper: 40 },
  { label: 'F', upper: 80 },
  { label: 'G', upper: 160 },
  { label: 'H', upper: 320 },
  { label: 'I', upper: 640 },
  { label: 'J', upper: 1280 },
  { label: 'K', upper: 2560 },
  { label: 'L', upper: 5120 },
  { label: 'M', upper: 10240 },
  { label: 'N', upper: 20480 },
  { label: 'O', upper: 40960 },
]

export function classifyMotor(totalImpulse: number): string {
  for (const band of IMPULSE_CLASS_BANDS) {
    if (totalImpulse <= band.upper) return band.label
  }
  return 'O+' // beyond the largest defined hobby-rocketry class
}

// V1: "<letter><rounded average thrust>", e.g. "C6". V4 will append
// "-<ejectionDelay>" once that metadata field exists (Test Metadata Panel).
export function buildMotorDesignation(
  classification: string,
  averageThrust: number,
  ejectionDelay?: number
): string {
  const base = `${classification}${Math.round(averageThrust)}`
  return ejectionDelay !== undefined ? `${base}-${ejectionDelay}` : base
}

export interface TestMetrics {
  totalImpulse: number
  peakThrust: number
  averageThrust: number
  burnTime: number
  motorClassification: string
  motorDesignation: string
}

// Computes all V1 core metrics for a test's TRIMMED data (per SPEC.md §5
// "Trim precedence" — only trimmed data is ever used in calculations).
// Returns null if metrics can't be meaningfully computed (e.g. thrust never
// reaches the ignition threshold).
export function computeMetrics(time: number[], thrust: number[]): TestMetrics | null {
  if (time.length < 2) return null

  const peakThrust = Math.max(...thrust)
  const totalImpulse = trapezoidalIntegral(time, thrust)

  const ignition = findSustainedIgnition(time, thrust)
  const burnoutResult = findIgnitionAndBurnout(time, thrust)

  if (ignition === null || burnoutResult === null) return null

  const burnTime = burnoutResult.burnout - ignition
  if (burnTime <= 0) return null

  const averageThrust = totalImpulse / burnTime
  const motorClassification = classifyMotor(totalImpulse)
  const motorDesignation = buildMotorDesignation(motorClassification, averageThrust)

  return {
    totalImpulse,
    peakThrust,
    averageThrust,
    burnTime,
    motorClassification,
    motorDesignation,
  }
}
