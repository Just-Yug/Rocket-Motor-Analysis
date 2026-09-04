import type { Test } from './types'
import { applyTrim, computeMetrics } from './utils'

interface MetricsPanelProps {
  test: Test
}

export default function MetricsPanel({ test }: MetricsPanelProps) {
  const { time, thrust } = applyTrim(test.time, test.thrust, test.trimRange)
  const metrics = computeMetrics(time, thrust)

  if (!metrics) {
    return (
      <p className="placeholder" style={{ marginTop: 12 }}>
        Not enough data above the ignition threshold to compute metrics.
      </p>
    )
  }

  return (
    <div className="metrics">
      <div className="metric-card">
        <div className="label">Total Impulse</div>
        <div className="value">{metrics.totalImpulse.toFixed(2)} N·s</div>
      </div>
      <div className="metric-card">
        <div className="label">Peak Thrust</div>
        <div className="value">{metrics.peakThrust.toFixed(2)} N</div>
      </div>
      <div className="metric-card">
        <div className="label">Average Thrust</div>
        <div className="value">{metrics.averageThrust.toFixed(2)} N</div>
      </div>
      <div className="metric-card">
        <div className="label">Burn Time</div>
        <div className="value">{metrics.burnTime.toFixed(2)} s</div>
      </div>
      <div className="metric-card">
        <div className="label">Motor Classification</div>
        <div className="value">{metrics.motorClassification}</div>
      </div>
      <div className="metric-card">
        <div className="label">Motor Designation</div>
        <div className="value">{metrics.motorDesignation}</div>
      </div>
    </div>
  )
}
