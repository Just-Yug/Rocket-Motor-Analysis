import { useEffect, useRef } from 'react'
import Plotly from 'plotly.js-dist-min'
import type { Test } from './types'

interface ThrustChartProps {
  test: Test
}

export default function ThrustChart({ test }: ThrustChartProps) {
  const plotRef = useRef<HTMLDivElement>(null)

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

    const layout: Partial<Plotly.Layout> = {
      paper_bgcolor: '#1c1f26',
      plot_bgcolor: '#1c1f26',
      font: { color: '#e8e9ee' },
      margin: { t: 20, r: 20, b: 50, l: 60 },
      xaxis: {
        title: 'Time (s)',
        gridcolor: '#33384a',
        zeroline: false,
        showspikes: true,
        spikemode: 'across',
        spikethickness: 1,
        spikedash: 'dot',
        spikecolor: '#9aa0b0',
      },
      yaxis: {
        title: 'Thrust (N)',
        gridcolor: '#33384a',
        zeroline: false,
        showspikes: true,
        spikemode: 'across',
        spikethickness: 1,
        spikedash: 'dot',
        spikecolor: '#9aa0b0',
      },
      hovermode: 'closest',
      hoverlabel: {
        bgcolor: 'rgba(0,0,0,0)',
        bordercolor: '#e8e9ee',
        font: { color: '#e8e9ee' },
      },
      autosize: true,
    }

    Plotly.react(plotRef.current, [trace], layout, {
      responsive: true,
      displaylogo: false,
    })
  }, [test])

  return <div ref={plotRef} style={{ width: '100%', height: '100%' }} />
}
