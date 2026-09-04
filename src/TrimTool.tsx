import { useCallback, useEffect, useRef, useState } from 'react'
import Plotly from 'plotly.js-dist-min'
import type { Test, TrimRange } from './types'
import { countUpwardCrossings } from './utils'

interface TrimToolProps {
  test: Test
  onConfirm: (trimRange: TrimRange) => void
}

type DragTarget = 'start' | 'end' | null

// Minimal shape of the internal Plotly graph-div fields we rely on for
// pixel <-> data conversion. Plotly does not officially document these,
// but they are stable and widely relied on for exactly this kind of
// custom overlay/drag interaction.
interface PlotlyInternalAxis {
  l2p: (dataValue: number) => number
  p2l: (pixelValue: number) => number
}
interface PlotlyGraphDiv extends HTMLDivElement {
  _fullLayout?: {
    xaxis: PlotlyInternalAxis
    margin: { l: number; t: number; r: number; b: number }
  }
}

export default function TrimTool({ test, onConfirm }: TrimToolProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const plotRef = useRef<HTMLDivElement>(null)
  const gdRef = useRef<PlotlyGraphDiv | null>(null)
  const dragTargetRef = useRef<DragTarget>(null)
  const startHandleRef = useRef<HTMLDivElement>(null)
  const endHandleRef = useRef<HTMLDivElement>(null)

  const dataMin = test.time[0]
  const dataMax = test.time[test.time.length - 1]

  const [start, setStart] = useState(dataMin)
  const [end, setEnd] = useState(dataMax)
  const [error, setError] = useState<string | null>(null)

  const crossingCount = countUpwardCrossings(test.thrust)

  const positionHandle = useCallback((el: HTMLDivElement | null, value: number) => {
    const gd = gdRef.current
    if (!gd?._fullLayout || !el) return
    const px = gd._fullLayout.margin.l + gd._fullLayout.xaxis.l2p(value)
    el.style.left = `${px}px`
  }, [])

  // Initial render + full redraw whenever the test itself changes
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

    const layout: Partial<Plotly.Layout> = {
      paper_bgcolor: '#1c1f26',
      plot_bgcolor: '#1c1f26',
      font: { color: '#e8e9ee' },
      margin: { t: 20, r: 20, b: 50, l: 60 },
      xaxis: { title: 'Time (s)', gridcolor: '#33384a', zeroline: false },
      yaxis: {
        title: 'Thrust (N)',
        gridcolor: '#33384a',
        zeroline: false,
        range: [0, maxThrust * 1.1],
      },
      shapes: [
        {
          type: 'rect', xref: 'x', yref: 'paper',
          x0: dataMin, x1: start, y0: 0, y1: 1,
          fillcolor: 'rgba(0,0,0,0.5)', line: { width: 0 },
        },
        {
          type: 'rect', xref: 'x', yref: 'paper',
          x0: end, x1: dataMax, y0: 0, y1: 1,
          fillcolor: 'rgba(0,0,0,0.5)', line: { width: 0 },
        },
      ],
      showlegend: false,
      autosize: true,
    }

    Plotly.react(plotRef.current, [trace], layout, { responsive: true, displaylogo: false }).then(() => {
      gdRef.current = plotRef.current as PlotlyGraphDiv
      positionHandle(startHandleRef.current, start)
      positionHandle(endHandleRef.current, end)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test])

  // When start/end are committed (on drag release, or via the number inputs),
  // update the shaded excluded regions and handle positions. This intentionally
  // does NOT run on every pixel of mouse movement — see handleMouseMove below.
  useEffect(() => {
    const gd = gdRef.current
    if (!gd) return
    Plotly.relayout(gd, {
      'shapes[0].x1': start,
      'shapes[1].x0': end,
    })
    positionHandle(startHandleRef.current, start)
    positionHandle(endHandleRef.current, end)
  }, [start, end, positionHandle])

  function dataValueFromClientX(clientX: number): number | null {
    const gd = gdRef.current
    if (!gd?._fullLayout || !wrapperRef.current) return null
    const rect = wrapperRef.current.getBoundingClientRect()
    const pxRelativeToPlotArea = clientX - rect.left - gd._fullLayout.margin.l
    return gd._fullLayout.xaxis.p2l(pxRelativeToPlotArea)
  }

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      const target = dragTargetRef.current
      if (!target) return
      const value = dataValueFromClientX(e.clientX)
      if (value === null) return
      const clamped = Math.min(Math.max(value, dataMin), dataMax)

      // Move only the handle's pixel position during drag (cheap DOM write) —
      // the actual React state (and Plotly shape redraw) commits on mouseup.
      if (target === 'start') {
        positionHandle(startHandleRef.current, Math.min(clamped, end))
      } else {
        positionHandle(endHandleRef.current, Math.max(clamped, start))
      }
    }

    function handleMouseUp(e: MouseEvent) {
      const target = dragTargetRef.current
      if (!target) return
      const value = dataValueFromClientX(e.clientX)
      dragTargetRef.current = null
      if (value === null) return
      const clamped = Math.min(Math.max(value, dataMin), dataMax)

      if (target === 'start') {
        setStart(Math.min(clamped, end))
      } else {
        setEnd(Math.max(clamped, start))
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end])

  function handleConfirm() {
    if (start >= end) {
      setError('Start must be before end.')
      return
    }
    onConfirm({ start, end })
  }

  return (
    <div className="trim-tool">
      <p className="import-error" style={{ color: '#ffcf6e' }}>
        {crossingCount > 1
          ? `Detected thrust rises above 5% of peak ${crossingCount} times — this usually means a pre-ignition spike or other anomaly. Drag the green lines to include only the real burn. 
             Drag the green lines to adjust the trim range, or confirm to use the full recording.'}
      </p>

      <div ref={wrapperRef} className="trim-chart-wrapper">
        <div ref={plotRef} style={{ width: '100%', height: '100%' }} />
        <div
          ref={startHandleRef}
          className="trim-handle"
          onMouseDown={() => { dragTargetRef.current = 'start' }}
        />
        <div
          ref={endHandleRef}
          className="trim-handle"
          onMouseDown={() => { dragTargetRef.current = 'end' }}
        />
      </div>

      <div className="mapping-row">
        <span>Start (s)</span>
        <input
          type="number"
          value={start}
          step="1"
          min={dataMin}
          max={end}
          onChange={(e) => {
            const v = parseFloat(e.target.value)
            if (!isNaN(v)) setStart(Math.min(Math.max(v, dataMin), end))
          }}
        />
      </div>
      <div className="mapping-row">
        <span>End (s)</span>
        <input
          type="number"
          value={end}
          step="1"
          min={start}
          max={dataMax}
          onChange={(e) => {
            const v = parseFloat(e.target.value)
            if (!isNaN(v)) setEnd(Math.max(Math.min(v, dataMax), start))
          }}
        />
      </div>

      {error && <p className="import-error">{error}</p>}

      <button onClick={handleConfirm}>Confirm Trim Range</button>
    </div>
  )
}
