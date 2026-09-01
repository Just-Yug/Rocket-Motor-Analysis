import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import type { ImportedFile, RawTable } from './types'

interface FileImportProps {
  onImported: (file: ImportedFile) => void
}

function parseCsvText(text: string): RawTable {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => line.split(',').map((cell) => cell.trim()))
}

function parseExcelBuffer(buffer: ArrayBuffer): RawTable {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[firstSheetName]
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })
  // Normalize every cell to a string so downstream parsing (Issue 3) is consistent
  return rows.map((row) => row.map((cell) => String(cell ?? '')))
}

export default function FileImport({ onImported }: FileImportProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    setError(null)
    const isExcel = /\.(xlsx|xls)$/i.test(file.name)
    const isCsv = /\.csv$/i.test(file.name)

    if (!isExcel && !isCsv) {
      setError('Unsupported file type. Please choose a .csv or .xlsx file.')
      return
    }

    const reader = new FileReader()

    reader.onerror = () => {
      setError('Could not read the file. It may be corrupted or in use by another program.')
    }

    reader.onload = (event) => {
      try {
        let table: RawTable

        if (isExcel) {
          const buffer = event.target?.result as ArrayBuffer
          table = parseExcelBuffer(buffer)
        } else {
          const text = event.target?.result as string
          table = parseCsvText(text)
        }

        if (table.length === 0) {
          setError('That file appears to be empty.')
          return
        }

        onImported({ name: file.name, table })
      } catch (err) {
        setError('Failed to parse the file. Check that it is a valid CSV or Excel file.')
      }
    }

    if (isExcel) {
      reader.readAsArrayBuffer(file)
    } else {
      reader.readAsText(file)
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0])
    }
    // reset so selecting the same file again still fires onChange
    e.target.value = ''
  }

  return (
    <div className="file-import">
      <div
        className={`drop-zone${isDragging ? ' dragover' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        Drop CSV/Excel file here
        <br />
        or click to browse
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleInputChange}
          style={{ display: 'none' }}
        />
      </div>
      {error && <p className="import-error">{error}</p>}
      <p className="hint">Supports .csv and .xlsx. You'll map columns to Time/Thrust next.</p>
    </div>
  )
}
