import { useState } from 'react'
import FileImport from './FileImport'
import MappingWizard from './MappingWizard'
import type { ImportedFile, Test } from './types'

function App() {
  const [pendingFile, setPendingFile] = useState<ImportedFile | null>(null)
  const [tests, setTests] = useState<Test[]>([])
  const [activeTestId, setActiveTestId] = useState<string | null>(null)

  const activeTest = tests.find((t) => t.id === activeTestId) ?? null

  function handleImported(file: ImportedFile) {
    setPendingFile(file)
  }

  function handleMappingConfirm(test: Test) {
    setTests((prev) => [...prev, test])
    setActiveTestId(test.id)
    setPendingFile(null)
  }

  function handleMappingCancel() {
    setPendingFile(null)
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
        <span className="version-tag">V1 — scaffolding</span>
      </header>
      <main className="app-layout">
        <section className="graph-area">
          {activeTest ? (
            <div>
              <p className="placeholder">
                Loaded "{activeTest.name}" — {activeTest.time.length} mapped data point(s).
              </p>
              <p className="placeholder">Plotting comes in Issue 4.</p>
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
                  <span>{test.name}</span>
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
