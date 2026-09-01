// Raw parsed file content: an array of rows, each row an array of string cell values.
// This is the intermediate form before column/row mapping (Issue 3) turns it into a Test.
export type RawTable = string[][]

export interface ImportedFile {
  name: string
  table: RawTable
}
