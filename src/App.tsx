import { useState } from 'react'
import FileImport from './FileImport'
import MappingWizard from './MappingWizard'
import TrimTool from './TrimTool'
import ThrustChart from './ThrustChart'
import MetricsPanel from './MetricsPanel'
import type { ImportedFile, Test, TrimRange } from './types'
import { countUpwardCrossings, autoTrimRange } from './utils'

function App() {
  const [pendingFile, setPendingFile] = useState<ImportedFile | null>(null)
  const [pendingTest, setPendingTest] = useState<Test | null>(null)
  const [pendingIsNew, setPendingIsNew] = useState(false)
  const [tests, setTests] = useState<Test[]>([])
  const [activeTestId, setActiveTestId] = useState<string | null>(null)

  const activeTest = tests.find((t) => t.id === activeTestId) ?? null

  function handleImported(file: ImportedFile) {
    setPendingFile(file)
  }

  function handleMappingConfirm(test: Test) {
    setPendingFile(null)

    const crossings = countUpwardCrossings(test.thrust)
    if (crossings > 1) {
      // Anomaly detected — force the trim tool before adding the test
      setPendingTest(test)
      setPendingIsNew(true)
    } else {
      // Clean test — silently auto-trim to [ignition - 2s, burnout + 2s]
      const auto = autoTrimRange(test.time, test.thrust)
      addTest({ ...test, trimRange: auto })
    }
  }

  function handleMappingCancel() {
    setPendingFile(null)
  }

  function handleTrimConfirm(trimRange: TrimRange) {
    if (!pendingTest) return
    if (pendingIsNew) {
      addTest({ ...pendingTest, trimRange })
    } else {
      setTests((prev) =>
        prev.map((t) => (t.id === pendingTest.id ? { ...t, trimRange } : t))
      )
    }
    setPendingTest(null)
  }

  function openManualTrim(test: Test) {
    setPendingTest(test)
    setPendingIsNew(false)
  }

  function addTest(test: Test) {
    setTests((prev) => [...prev, test])
    setActiveTestId(test.id)
  }

  function handleDelete(id: string) {
    setTests((prev) => prev.filter((t) => t.id !== id))
    if (activeTestId === id) {
      setActiveTestId(null)
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Rocket Motor Thrust Curve Plotter</h1>
        <span className="version-tag">V1</span>
      </header>
      <main className="app-layout">
        <section className="graph-area">
          {pendingTest ? (
            <TrimTool
              test={pendingTest}
              initialRange={pendingTest.trimRange}
              onConfirm={handleTrimConfirm}
            />
          ) : activeTest ? (
            <div className="chart-container">
              <div className="chart-toolbar">
                <button className="secondary trim-btn" onClick={() => openManualTrim(activeTest)}>
                  Trim…
                </button>
              </div>
              <div className="chart-plot-area">
                <ThrustChart test={activeTest} />
              </div>
              <MetricsPanel test={activeTest} />
            </div>
          ) : (
            <p className="placeholder">Import and map a test to see it here →</p>
          )}
        </section>
        <aside className="side-panel">
          <h2 className="panel-heading">Import Test Data</h2>

          {pendingFile ? (
            <MappingWizard
              file={pendingFile}
              onConfirm={handleMappingConfirm}
              onCancel={handleMappingCancel}
            />
          ) : (
            <FileImport onImported={handleImported} />
          )}

          {tests.length > 0 && (
            <div className="file-list">
              {tests.map((test) => (
                <div
                  key={test.id}
                  className={`file-item${test.id === activeTestId ? ' active' : ''}`}
                  onClick={() => setActiveTestId(test.id)}
                >
                  <span>
                    {test.name}
                    {test.trimRange ? ' (trimmed)' : ''}
                  </span>
                  <button
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(test.id)
                    }}
                    aria-label={`Delete ${test.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </aside>
      </main>
    </div>
  )
}

export default App
