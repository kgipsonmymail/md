export type DiffLineType = 'same' | 'add' | 'remove'

export interface DiffLine {
  type: DiffLineType
  text: string
  oldLineNumber: number | null
  newLineNumber: number | null
}

export function createLineDiff(before: string, after: string): DiffLine[] {
  const oldLines = before.split('\n')
  const newLines = after.split('\n')
  const output: DiffLine[] = []

  let i = 0
  let j = 0
  let oldLineNumber = 1
  let newLineNumber = 1

  while (i < oldLines.length || j < newLines.length) {
    const oldLine = oldLines[i]
    const newLine = newLines[j]

    if (oldLine !== undefined && newLine !== undefined && oldLine === newLine) {
      output.push({
        type: 'same',
        text: oldLine,
        oldLineNumber,
        newLineNumber,
      })
      i += 1
      j += 1
      oldLineNumber += 1
      newLineNumber += 1
      continue
    }

    const oldNext = oldLines[i + 1]
    const newNext = newLines[j + 1]

    if (newLine !== undefined && oldLine === newNext) {
      output.push({
        type: 'add',
        text: newLine,
        oldLineNumber: null,
        newLineNumber,
      })
      j += 1
      newLineNumber += 1
      continue
    }

    if (oldLine !== undefined && oldNext === newLine) {
      output.push({
        type: 'remove',
        text: oldLine,
        oldLineNumber,
        newLineNumber: null,
      })
      i += 1
      oldLineNumber += 1
      continue
    }

    if (oldLine !== undefined) {
      output.push({
        type: 'remove',
        text: oldLine,
        oldLineNumber,
        newLineNumber: null,
      })
      i += 1
      oldLineNumber += 1
    }

    if (newLine !== undefined) {
      output.push({
        type: 'add',
        text: newLine,
        oldLineNumber: null,
        newLineNumber,
      })
      j += 1
      newLineNumber += 1
    }
  }

  return output
}
