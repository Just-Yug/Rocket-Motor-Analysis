# SPEC.md
## Rocket Motor Thrust Curve Plotter

**Status:** Draft v1
**Owner:** Project Lead / Coordinator (design, direction, and project management)
**Purpose of this document:** Single source of truth for what this application is, what it does, and how it should be built. Intended to guide AI-assisted development and any future contributors.

---

## 1. Overview

The Rocket Motor Thrust Curve Plotter is an open-source application for amateur rocketry hobbyists to analyze static-fire test data from experimental/amateur rocket motors. Its core purpose is to plot **Thrust vs. Time** curves from test data (CSV/Excel), organize tests into "models" of identically-built motors (grouped under impulse-based motor "classes"), compute standard motor performance metrics, and export results in formats usable by common rocketry simulation tools.

The application ships as a single codebase with two deployment targets:
- A **web app**, usable directly in the browser
- A **downloadable desktop app** (Windows/Mac/Linux), for offline use, faster local processing, and full local file access

It is developed and released as **open source**.

---

## 2. Core Concepts / Glossary

| Term | Definition |
|---|---|
| **Test** | A single static-fire data recording of one motor: a time series of thrust (and optionally chamber pressure) values. |
| **Model** | A group of motors built identically — same casing, nozzle length, propellant amount, bulkhead powder amount, ramming increments, etc. Tests from motors of the same model are assumed to be statistically comparable. (Previously referred to as "series.") |
| **Class** | The impulse-based motor classification (e.g., "G", "H") that a model falls under, determined by its Total Impulse. Each class can contain multiple models. |
| **Average Curve** | The point-by-point average of all tests belonging to a model, used as the representative performance profile for that motor design. |
| **Action Time** | The duration from ignition to the point where thrust drops to a negligible/zero value (may extend slightly beyond formal "burn time"). |
| **Burn Time** | The duration the propellant is actively burning, typically defined by a thrust threshold (e.g., 5% of peak). |
| **Total Impulse** | The integral of thrust over time (∫F dt) — total momentum imparted by the motor, in Newton-seconds. |
| **Specific Impulse (Isp)** | Total impulse divided by (propellant weight × standard gravity) — a measure of propellant efficiency, in seconds. |
| **Motor Classification** | The standard amateur/commercial rocketry letter class (e.g., "G", "H") derived from Total Impulse banding. |
| **Thrust Coefficient (Cf)** | A dimensionless measure of nozzle efficiency, relating thrust to chamber pressure and nozzle throat area. |
| **Mass Flow Rate (ṁ)** | The mass of solid propellant converted into exhaust gas per second (kg/s), given by ṁ = ρₚ · A_b · r, where ρₚ is propellant density, A_b is burn surface area, and r is propellant burn rate. |

---

## 3. Feature Tiers

Features are grouped into build phases. Each phase should be a functioning, demoable milestone.

### MVP (V1)
- Import a single test file (CSV or Excel)
- CSV/Excel import mapping wizard
- Plot Thrust vs. Time for that single test
- Trim/crop tool: applied to every imported test, not just anomalous ones. If the thrust signal crosses upward through the 5% peak-thrust threshold exactly once (a clean test), the app automatically applies a trim window of [ignition time − 2s, burnout time + 2s], clamped to the recorded data bounds, with no user prompt. If it crosses upward more than once (indicating a pre-ignition spike or other anomaly), the trim tool opens automatically and requires the user to confirm a range before the test is added. In both cases, the trim range can be reopened and manually adjusted at any time via a "Trim…" control, with dragable boundary handles or numeric input. Once set, only data inside the trim window is used for plotting and all calculations — data outside the trim window is excluded entirely, not just visually hidden
- Calculate and display: Total Impulse, Peak Thrust, Average Thrust, Burn Time, Motor Classification, Motor Designation
- Flat (non-hierarchical) list of imported test files, with the ability to remove/delete an imported test from the list
- Basic dark theme only

### V2 — Models, Classes & Multi-Plot
- Group tests into models
- Group models into classes (by Total Impulse banding)
- Model averaging → average curve
- Full metrics set: + Action Time, Specific Impulse, Thrust Coefficient
- Multi-test plotting (up to 16 tests simultaneously, distinct colors) + average curve in a distinct highlight color
- Notion-style accordion hierarchical navigation (class → model → tests)
- Click-to-preview / lock-to-pin test selection behavior

### V3 — Analysis Depth
- Chamber pressure support (Peak/Average Chamber Pressure), if pressure data is available
- Outlier flagging in model averaging
- Overlay normalization toggle (align by ignition point, using the same configurable peak-thrust threshold convention as Burn Time — default 5%)
- Uncertainty/error bands on average curve
- Optional noise filtering for load cell data (e.g. moving average / low-pass smoothing), toggleable per test and applied before metrics calculation — off by default so raw signal remains viewable

### V4 — Workflow & Interop
- Test metadata panel (batch #, ambient temp, casing serial, date, ejection delay), searchable/filterable — the ejection delay field, once set, extends V1's Motor Designation with a `-<delay>` suffix (e.g., "C6" becomes "C6-3"), used in the batch report/PDF export
- Crosshair ruler lines + dotted-border point tooltip
- Settings panel: dark theme, HSV color-square picker for the 16 test colors, sustained-threshold minimum duration (default 50ms) with on/off toggle, peak-thrust threshold percentage (default 5%) used for ignition/burnout/Burn Time detection and shared by Overlay Normalization and the auto-trim/anomaly-detection logic
- Export to simulation-compatible formats (OpenRocket `.eng` / `.rse`)
- Batch report export (PDF summary per model)
- Comparison mode across models (overlay averages from different models)

**Non-goals (explicitly out of scope for the foreseeable roadmap):**
- User accounts / cloud sync / multi-user collaboration
- Real-time data acquisition from test stands (this is a post-processing/analysis tool, not a DAQ system)
- Flight simulation itself (the app exports data *to* simulators; it does not simulate flights)
- Mobile app versions

---

## 4. Data Model

### Test
```
Test {
  id: string
  modelId: string | null        // null if ungrouped
  name: string
  date: string (ISO date)
  rawData: [{ time: number, thrust: number, pressure?: number }]
  trimRange: { start: number, end: number } | null  // active data window; all calculations use only rawData within this range. null = full range, no trim applied
  metadata: {
    propellantBatch?: string
    ambientTemp?: number
    casingSerial?: string
    ejectionDelay?: number        // user-provided, seconds; added via V4's Test Metadata Panel — not derivable from thrust-curve data
    notes?: string
  }
  locked: boolean               // pinned to main graph
  color?: string                // assigned when pinned
  excludedFromAverage: boolean  // for manual/outlier exclusion
}
```

### Model
```
Model {
  id: string
  classId: string | null        // impulse-based class this model belongs to
  name: string
  description?: string          // casing/nozzle/propellant spec notes
  testIds: string[]
}
```

### Class
```
Class {
  id: string
  letter: string                 // e.g. "G", "H" — derived from Total Impulse banding
  modelIds: string[]
}
```

### Computed Metrics (derived, not stored raw)
```
Metrics {
  totalImpulse: number
  peakThrust: number
  averageThrust: number
  burnTime: number
  actionTime: number
  specificImpulse: number
  motorClassification: string
  motorDesignation: string       // e.g. "G80" — classification letter + rounded average thrust
  peakChamberPressure?: number
  averageChamberPressure?: number
  thrustCoefficient?: number
  massFlowRate?: number
}
```

---

## 5. Calculations Reference

> These formulas must be implemented exactly as specified to avoid ambiguity. All time values in seconds, thrust in Newtons, pressure in Pascals (or as consistently defined).

- **Total Impulse** = ∫ Thrust dt (numerical integration, e.g., trapezoidal rule, over the full recorded burn)
- **Peak Thrust** = max(Thrust) across the dataset
- **Average Thrust** = Total Impulse ÷ Burn Time
- **Burn Time** = duration between the first and last time the thrust crosses a defined threshold (commonly 5% of Peak Thrust), rising and falling edge
- **Action Time** = duration between ignition (first non-zero/threshold thrust) and effective thrust termination (may use a lower tail-off threshold than Burn Time)
- **Specific Impulse (Isp)** = Total Impulse ÷ (Propellant Weight × g₀), where g₀ = 9.80665 m/s² — requires propellant mass as an input field per test/model
- **Motor Classification** = standard NAR/Tripoli impulse lettering, where each class letter represents a doubling of impulse range starting at Total Impulse = 1.25 Ns (Class A upper bound), e.g., A: 1.26–2.50 Ns, B: 2.51–5.00 Ns, etc.
- **Motor Designation** = `<Motor Classification letter><Average Thrust, rounded to the nearest whole Newton>` (V1), e.g. "C6" for a Class C motor averaging ~6N of thrust. Once `metadata.ejectionDelay` is available (V4, via the Test Metadata Panel), it is appended as `-<delay in seconds>` (e.g., "C6-3"), matching the standard hobby-rocketry motor designation convention. The delay is never calculated from thrust-curve data — it is entered by the user, since it depends on the ejection charge rather than the propellant burn.
- **Peak / Average Chamber Pressure** = max / mean of recorded pressure channel, if present
- **Thrust Coefficient (Cf)** = Thrust ÷ (Chamber Pressure × Nozzle Throat Area) — requires nozzle throat area as a known input
- **Mass Flow Rate (ṁ)** = ρₚ · A_b · r, where ρₚ is propellant density, A_b is burn surface area, and r is propellant burn rate — requires propellant density, burn surface area, and burn rate as known inputs (kg/s)

All thresholds (e.g., the 5% peak-thrust cutoff used for ignition/burnout/Burn Time) are hardcoded defaults in V1–V3 and become user-configurable in V4's Settings panel, since conventions vary. The Overlay Normalization Toggle's ignition-point detection (V3) and the auto-trim/anomaly-detection logic (V1, Issue 8) both reuse this same peak-thrust threshold value and setting, rather than defining separate ones — so changing it in Settings (V4) affects all of them consistently.

**Trim precedence:** when a test has a `trimRange` set (V1, manual trim/crop tool), all of the above calculations — and all threshold/crossing detection described below — operate only on the data points within `trimRange`. Data outside the trim window is not read by any calculation, plot, or averaging step; it is treated as if it does not exist for that test.

**Sustained-threshold requirement (ignition/burn-start detection):** a threshold crossing (e.g., for Burn Time or Action Time start) only counts as valid once the thrust signal remains above the threshold continuously for a minimum duration (default: 50ms), rather than triggering on the first instant it crosses. This prevents brief rig noise, load-cell transients, or clamp-release spikes from being mistaken for ignition. This minimum duration is configurable in the Settings panel (V4) and can be disabled entirely (reverting to instant-crossing detection) if the user prefers.

**Auto-trimming and detecting when a manual trim is needed:** the app counts only *upward* crossings of the 5% peak-thrust threshold (thrust rising from below the threshold to above it) — downward crossings (thrust falling back below threshold) are not counted for this check, since every normal test has exactly one upward crossing (ignition) and one downward crossing (burnout). 
- If a test has **exactly one** upward crossing (a clean test), the app automatically applies a trim window of `[ignition time − 2s, burnout time + 2s]`, clamped to the recorded data bounds — no user prompt is required, and the test proceeds directly to plotting/metrics using this auto-trimmed range.
- If a test has **more than one** upward crossing, this indicates an anomaly (e.g., a pre-ignition spike), and the app automatically opens the manual trim/crop tool, requiring the user to confirm a data window before the test is added.
- In either case, the resulting trim range can be reopened and manually readjusted at any time via a "Trim…" control, pre-filled with the test's current range.
- The 2-second padding value and the 5% threshold ratio are both intended to be configurable in the Settings panel (V4); V1 uses fixed defaults for both.

When per-test noise filtering (V3) is enabled for a given test, filtering is applied to the raw signal first, and all metrics above are then calculated from the filtered curve rather than the raw one, for that test.

---

## 6. UI/UX Specification

### Layout
- **Graphing area**: 75% of screen width. Displays selected/pinned test curves + model average.
- **Navigation panel**: 25% of screen width. Notion-style accordion tree: Class → Model → Tests.

### Selection Behavior
- Classes, models, and tests are expanded/collapsed using the accordion tree's disclosure controls (independent of clicking a test row to select it)
- Double-clicking a test → immediately shows only that test's graph in the main graphing area (preview, not persisted)
- Clicking a test while holding a designated modifier key, or toggling a lock checkbox on the test row → pins the test permanently to the graph and assigns it one of 16 available colors

### Graph Interaction
- Cursor anywhere inside the graph area → crosshair lines appear (dashed, one vertical, one horizontal), intersecting at cursor position
- Cursor hovering directly over a plotted data point → tooltip box appears: dotted border, no fill, displaying that point's exact (time, thrust) values

### Color System
- 16 fixed "slots" for individual pinned test colors, distinct from the average curve's highlight color
- Default palette provided out of the box (should be legible/distinguishable, colorblind-consideration where feasible)
- Settings panel allows remapping any of the 16 colors via an HSB/HSV saturation-value square picker

### Themes
- Light and dark mode, toggle in settings

---

## 7. File Formats

### Import
- CSV and Excel (`.xlsx`) accepted
- Import mapping wizard: user maps file columns to Time / Thrust / Pressure (optional) / other fields on first import of a new file layout; mapping can be saved/reused for future files with the same layout

### Export
- **OpenRocket-compatible motor file**: RASP `.eng` format (simple, widely supported) as the primary target; RockSim `.rse` XML format as a secondary/stretch goal
- Export includes: thrust curve data points, motor physical dimensions (diameter, length), propellant mass, delay options if applicable
- **Batch report**: PDF export per model containing calculated metrics table + average curve graph image

---

## 8. Technical Architecture

| Layer | Choice | Rationale |
|---|---|---|
| UI framework | React + TypeScript | Widest AI-coding-assistant support, strong typing reduces calculation bugs |
| Desktop packaging | Tauri | Lightweight native wrapper around the web app; single codebase for web + desktop; smaller/faster than Electron |
| Charting | Plotly.js | Built-in hover/crosshair behavior closely matches spec requirements; handles many overlapping series well |
| Local data storage | IndexedDB (web) / native filesystem (Tauri desktop) | No server or user accounts required; all data stays on the user's machine |
| Report export | PDF generation library (e.g., pdf-lib or similar, TBD at implementation time) | For batch report export |

No backend server is required for core functionality — all parsing, calculation, and storage happens client-side.

---

## 9. Open Questions (to resolve before/during V1–V2)

- What sensors do test stands actually record (thrust only, or thrust + chamber pressure)? This determines whether pressure-based metrics are real features or dead UI.
- Is propellant mass and nozzle throat area recorded per-test or per-series (needed for Isp and Cf calculations)?
- Confirm exact burn-time/action-time threshold conventions to use as defaults.
- License choice for open-source release (MIT or Apache 2.0 recommended).

---

## 10. Project Management Notes

- Each version (Section 3) should correspond to a milestone/project board column
- Design decisions and their rationale should be logged as they're made (architecture decisions, format choices, threshold conventions) — this documentation trail is itself a project deliverable
- Repository should include: README with screenshots/demo, LICENSE, CONTRIBUTING.md, issue templates
