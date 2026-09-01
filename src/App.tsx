import { useState } from 'react'
import FileImport from './FileImport'
import type { ImportedFile } from './types'

function App() {
  const [importedFile, setImportedFile] = useState<ImportedFile | null>(null)

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Rocket Motor Thrust Curve Plotter</h1>
        <span className="version-tag">V1 — scaffolding</span>
      </header>
      <main className="app-layout">
        <section className="graph-area">
          {importedFile ? (
            <div>
              <p className="placeholder">
                Loaded "{importedFile.name}" — {importedFile.table.length} row(s) parsed.
              </p>
              <p className="placeholder">Plotting comes in Issue 4; mapping wizard comes in Issue 3.</p>
            </div>
          ) : (
            <p className="placeholder">Graphing area — coming in Issue 4</p>
          )}
        </section>
        <aside className="side-panel">
          <h2 className="panel-heading">Import Test Data</h2>
          <FileImport onImported={setImportedFile} />
          {importedFile && (
            <div className="file-list">
              <div className="file-item active">{importedFile.name}</div>
            </div>
          )}
        </aside>
      </main>
    </div>
  )
}

export default App
