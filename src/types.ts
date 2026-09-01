// Raw parsed file content: an array of rows, each row an array of string cell values.
// This is the intermediate form before column/row mapping (Issue 3) turns it into a Test.
export type RawTable = string[][]

export interface ImportedFile {
  name: string
  table: RawTable
}

export interface TrimRange {
  start: number
  end: number
}

// A single mapped, ready-to-plot motor test — matches SPEC.md §4 Data Model.
// time/thrust hold the FULL, untrimmed mapped data; trimRange (if set) defines
// the active window that all plotting and calculations should actually use —
// see applyTrim() in utils.ts.
export interface Test {
  id: string
  name: string
  time: number[]
  thrust: number[]
  trimRange: TrimRange | null
}
