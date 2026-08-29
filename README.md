# Rocket Motor Thrust Curve Plotter

An open-source application for amateur rocketry hobbyists to analyze static-fire test data from experimental/amateur rocket motors — plot Thrust vs. Time curves, organize tests into motor models and impulse classes, compute standard performance metrics, and export results for use in popular rocketry simulation tools.

Built as a web app, with a downloadable desktop version for offline, faster local use.

## About

This project is designed and directed by **Just-Yug** (concept, technical specification, and project management), with implementation carried out via AI-assisted development.

## Status

🚧 Early development — V1 (MVP) in progress.

See [SPEC.md](./SPEC.md) for the full project specification, feature roadmap (V1–V4), data model, calculations reference, and technical architecture.

## Core Features (planned)

- Import motor test data from CSV/Excel with a guided column-mapping wizard
- Plot Thrust vs. Time curves, with up to 16 individual tests shown at once
- Organize tests into **Models** (identically-built motors) and **Classes** (impulse-based groupings)
- Automatic averaging across a model's tests, with outlier flagging and uncertainty bands
- Standard performance metrics: Total Impulse, Peak Thrust, Average Thrust, Burn Time, Action Time, Specific Impulse, Motor Classification, Chamber Pressure, Thrust Coefficient, Mass Flow Rate
- Interactive crosshair and point-value tooltips on the graph
- Export to simulation-compatible formats (OpenRocket)
- Light/dark themes with customizable color assignment

## Tech Stack

- **React + TypeScript** — UI
- **Tauri** — lightweight desktop packaging (Windows/Mac/Linux) from the same web codebase
- **Plotly.js** — charting
- **IndexedDB** (web) / native filesystem (desktop) — local data storage, no server required

## Getting Started

_Setup instructions will be added once the initial project scaffolding is in place._

## Contributing

Contributions, issues, and feature suggestions are welcome. Please see [SPEC.md](./SPEC.md) for the project's design intent before opening a PR.

## License

This project is licensed under the [MIT License](./LICENSE).
