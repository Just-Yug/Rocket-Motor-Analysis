import { useMemo, useState } from 'react'
import type { ImportedFile, RawTable, Test } from './types'

interface MappingWizardProps {
  file: ImportedFile
  onConfirm: (test: Test) => void
  onCancel: () => void
}

type SourceKind = 'row' | 'col'

interface SourceOption {
  value: string // "row:0" or "col:2"
  label: string
}

// Wide layout heuristic: few rows, many more columns than rows -> each ROW is a variable
// (matches raw sensor-log exports like the KNSB test file: row 0 = time, row 1 = thrust)
function isWideLayout(table: RawTable): boolean {
  const numRows = table.length
  const numCols = table[0]?.length ?? 0
  return numRows <= 6 && numCols > numRows * 3
}

function buildOptions(table: RawTable): { options: SourceOption[]; headerRowUsed: boolean } {
  if (isWideLayout(table)) {
    const options = table.map((row, i) => {
      const preview = row.slice(0, 3).map((v) => Number(v).toFixed(3)).join(', ')
      return { value: `row:${i}`, label: `Row ${i + 1} (${row.length} values, starts ${preview}…)` }
    })
    return { options, headerRowUsed: false }
  }

  const firstRow = table[0] ?? []
  const headerLikely = firstRow.some((v) => isNaN(parseFloat(v)))
  const headers = headerLikely ? firstRow : firstRow.map((_, i) => `Column ${i + 1}`)
  const options = headers.map((h, i) => ({ value: `col:${i}`, label: h || `Column ${i + 1}` }))
  return { options, headerRowUsed: headerLikely }
}

function extractSeries(table: RawTable, value: string, headerRowUsed: boolean): number[] {
  const [kind, idxStr] = value.split(':') as [SourceKind, string]
  const idx = parseInt(idxStr, 10)

  if (kind === 'row') {
    return table[idx].map(Number).filter((v) => !isNaN(v))
  }

  const startRow = headerRowUsed ? 1 : 0
  return table
    .slice(startRow)
    .map((r) => Number(r[idx]))
    .filter((v) => !isNaN(v))
}

export default function MappingWizard({ file, onConfirm, onCancel }: MappingWizardProps) {
  const { options, headerRowUsed } = useMemo(() => buildOptions(file.table), [file.table])

  const [timeValue, setTimeValue] = useState(options[0]?.value ?? '')
  const [thrustValue, setThrustValue] = useState(options[1]?.value ?? options[0]?.value ?? '')
  const [error, setError] = useState<string | null>(null)

  function handleConfirm() {
    if (!timeValue || !thrustValue) {
      setError('Please choose both a Time and a Thrust source.')
      return
    }
    if (timeValue === thrustValue) {
      setError('Time and Thrust must be different rows/columns.')
      return
    }

    const time = extractSeries(file.table, timeValue, headerRowUsed)
    const thrust = extractSeries(file.table, thrustValue, headerRowUsed)

    if (time.length < 2 || thrust.length < 2) {
      setError('Not enough numeric data found in the selected source(s).')
      return
    }

    const n = Math.min(time.length, thrust.length)
    const test: Test = {
      id: `${file.name}-${Date.now()}`,
      name: file.name,
      time: time.slice(0, n),
      thrust: thrust.slice(0, n),
    }
    onConfirm(test)
  }

  return (
    <div className="mapping-box">
      <p className="panel-heading" style={{ marginBottom: 12 }}>
        Map columns for "{file.name}"
      </p>

      <div className="mapping-row">
        <span>Time source</span>
        <select value={timeValue} onChange={(e) => setTimeValue(e.target.value)}>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mapping-row">
        <span>Thrust source</span>
        <select value={thrustValue} onChange={(e) => setThrustValue(e.target.value)}>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="import-error">{error}</p>}

      <button onClick={handleConfirm}>Plot This Test</button>
      <button className="secondary" onClick={onCancel}>
        Cancel
      </button>
    </div>
  )
}
