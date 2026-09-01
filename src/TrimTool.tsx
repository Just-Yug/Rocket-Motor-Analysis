import { useEffect, useRef, useState } from 'react'
import Plotly from 'plotly.js-dist-min'
import type { Test, TrimRange } from './types'
import { countUpwardCrossings } from './utils'

interface TrimToolProps {
  test: Test
  onConfirm: (trimRange: TrimRange) => void
}

export default function TrimTool({ test, onConfirm }: TrimToolProps) {
  const plotRef = useRef<HTMLDivElement>(null)
  const dataMin = test.time[0]
  const dataMax = test.time[test.time.length - 1]

  const [start, setStart] = useState(dataMin)
  const [end, setEnd] = useState(dataMax)
  const [error, setError] = useState<string | null>(null)

  const crossingCount = countUpwardCrossings(test.thrust)

  useEffect(() => {
    if (!plotRef.current) return

    const trace: Partial<Plotly.PlotData> = {
      x: test.time,
      y: test.thrust,
      type: 'scatter',
      mode: 'lines',
      line: { color: '#6ea8ff', width: 2 },
      name: test.name,
    }

    const maxThrust = Math.max(...test.thrust)

    const shapes: Partial<Plotly.Shape>[] = [
      // Shade excluded region before the trim start
      {
        type: 'rect',
        xref: 'x',
        yref: 'paper',
        x0: dataMin,
        x1: start,
        y0: 0,
        y1: 1,
        fillcolor: 'rgba(0,0,0,0.5)',
        line: { width: 0 },
      },
      // Shade excluded region after the trim end
      {
        type: 'rect',
        xref: 'x',
        yref: 'paper',
        x0: end,
        x1: dataMax,
        y0: 0,
        y1: 1,
        fillcolor: 'rgba(0,0,0,0.5)',
        line: { width: 0 },
      },
      // Trim boundary lines
      {
        type: 'line',
        xref: 'x',
        yref: 'paper',
        x0: start,
        x1: start,
        y0: 0,
        y1: 1,
        line: { color: '#5fd08a', width: 2, dash: 'dash' },
      },
      {
        type: 'line',
        xref: 'x',
        yref: 'paper',
        x0: end,
        x1: end,
        y0: 0,
        y1: 1,
        line: { color: '#5fd08a', width: 2, dash: 'dash' },
      },
    ]

    const layout: Partial<Plotly.Layout> = {
      paper_bgcolor: '#1c1f26',
      plot_bgcolor: '#1c1f26',
      font: { color: '#e8e9ee' },
      margin: { t: 20, r: 20, b: 50, l: 60 },
      xaxis: { title: 'Time (s)', gridcolor: '#33384a', zeroline: false },
      yaxis: { title: 'Thrust (N)', gridcolor: '#33384a', zeroline: false, range: [0, maxThrust * 1.1] },
      shapes,
      showlegend: false,
      autosize: true,
    }

    Plotly.react(plotRef.current, [trace], layout, { responsive: true, displaylogo: false })
  }, [test, start, end, dataMin, dataMax])

  function handleConfirm() {
    if (start >= end) {
      setError('Start must be before end.')
      return
    }
    if (start < dataMin || end > dataMax) {
      setError('Range must be within the recorded data.')
      return
    }
    onConfirm({ start, end })
  }

  return (
    <div className="trim-tool">
      <p className="import-error" style={{ color: '#ffcf6e' }}>
        {crossingCount > 1
          ? `Detected ${crossingCount} thrust rises above 5% of peak — this usually means a pre-ignition spike or other anomaly. Adjust the range below to include only the real burn.`
          : 'Adjust the trim range if needed, or confirm to use the full recording.'}
      </p>

      <div ref={plotRef} style={{ width: '100%', height: 260 }} />

      <div className="mapping-row">
        <span>Start (s)</span>
        <input
          type="number"
          value={start}
          step="any"
          min={dataMin}
          max={dataMax}
          onChange={(e) => setStart(parseFloat(e.target.value))}
        />
      </div>
      <div className="mapping-row">
        <span>End (s)</span>
        <input
          type="number"
          value={end}
          step="any"
          min={dataMin}
          max={dataMax}
          onChange={(e) => setEnd(parseFloat(e.target.value))}
        />
      </div>

      {error && <p className="import-error">{error}</p>}

      <button onClick={handleConfirm}>Confirm Trim Range</button>
    </div>
  )
}
