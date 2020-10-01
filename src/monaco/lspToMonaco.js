/**
 * Adapted fom monaco-languageclient (https://github.com/TypeFox/monaco-languageclient)
 * Copyright (c) 2018 TypeFox GmbH (http://www.typefox.io)

 * All rights reserved.

 * MIT License

 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import * as Is from '../utils/is'
// import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'

export function asCompletionResult(result, defaultRange) {
  if (!result) {
    return {
      incomplete: false,
      suggestions: [],
    }
  }
  if (Array.isArray(result)) {
    const suggestions = result.map((item) =>
      asCompletionItem(item, defaultRange)
    )
    return {
      incomplete: false,
      suggestions,
    }
  }
  return {
    incomplete: result.isIncomplete,
    suggestions: result.items.map((item) =>
      asCompletionItem(item, defaultRange)
    ),
  }
}

function asPosition(position) {
  if (position === undefined) {
    return undefined
  }
  if (position === null) {
    return null
  }
  const { line, character } = position
  const lineNumber = line === undefined ? undefined : line + 1
  const column = character === undefined ? undefined : character + 1
  // if (lineNumber !== undefined && column !== undefined) {
  //   return new monaco.Position(lineNumber, column)
  // }
  return { lineNumber, column }
}

function isMarkupContent(value) {
  return (
    Is.objectLiteral(value) &&
    ['markdown', 'plaintext'].includes(value.kind) &&
    Is.string(value.value)
  )
}

function asMarkdownString(content) {
  if (isMarkupContent(content)) {
    return {
      value: content.value,
    }
  }
  if (Is.string(content)) {
    return { value: content }
  }
  const { language, value } = content
  return {
    value: '```' + language + '\n' + value + '\n```',
  }
}

function asDocumentation(value) {
  if (Is.string(value)) {
    return value
  }
  if (value.kind === 'plaintext' /* MarkupKind.PlainText */) {
    return value.value
  }
  return asMarkdownString(value)
}

function asCompletionInsertText(item, defaultRange) {
  const isSnippet = item.insertTextFormat === 2 // InsertTextFormat.Snippet
  if (item.textEdit) {
    const range = asRange(item.textEdit.range)
    const value = item.textEdit.newText
    return { isSnippet, insertText: value, range, fromEdit: true }
  }
  if (item.insertText) {
    return {
      isSnippet,
      insertText: item.insertText,
      fromEdit: false,
      range: defaultRange,
    }
  }
  return {
    insertText: item.label,
    range: defaultRange,
    fromEdit: false,
    isSnippet: false,
  }
}

function asCompletionItemKind(value) {
  if (
    1 /* CompletionItemKind.Text */ <= value &&
    value <= 25 /* CompletionItemKind.TypeParameter */
  ) {
    switch (value) {
      case 1 /* CompletionItemKind.Text */:
        return [18 /* monaco.languages.CompletionItemKind.Text */, undefined]
      case 2 /* CompletionItemKind.Method */:
        return [0 /* monaco.languages.CompletionItemKind.Method */, undefined]
      case 3 /* CompletionItemKind.Function */:
        return [1 /* monaco.languages.CompletionItemKind.Function */, undefined]
      case 4 /* CompletionItemKind.Constructor */:
        return [
          2 /* monaco.languages.CompletionItemKind.Constructor */,
          undefined,
        ]
      case 5 /* CompletionItemKind.Field */:
        return [3 /* monaco.languages.CompletionItemKind.Field */, undefined]
      case 6 /* CompletionItemKind.Variable */:
        return [4 /* monaco.languages.CompletionItemKind.Variable */, undefined]
      case 7 /* CompletionItemKind.Class */:
        return [5 /* monaco.languages.CompletionItemKind.Class */, undefined]
      case 8 /* CompletionItemKind.Interface */:
        return [
          7 /* monaco.languages.CompletionItemKind.Interface */,
          undefined,
        ]
      case 9 /* CompletionItemKind.Module */:
        return [8 /* monaco.languages.CompletionItemKind.Module */, undefined]
      case 10 /* CompletionItemKind.Property */:
        return [9 /* monaco.languages.CompletionItemKind.Property */, undefined]
      case 11 /* CompletionItemKind.Unit */:
        return [12 /* monaco.languages.CompletionItemKind.Unit */, undefined]
      case 12 /* CompletionItemKind.Value */:
        return [13 /* monaco.languages.CompletionItemKind.Value */, undefined]
      case 13 /* CompletionItemKind.Enum */:
        return [15 /* monaco.languages.CompletionItemKind.Enum */, undefined]
      case 14 /* CompletionItemKind.Keyword */:
        return [17 /* monaco.languages.CompletionItemKind.Keyword */, undefined]
      case 15 /* CompletionItemKind.Snippet */:
        return [25 /* monaco.languages.CompletionItemKind.Snippet */, undefined]
      case 16 /* CompletionItemKind.Color */:
        return [19 /* monaco.languages.CompletionItemKind.Color */, undefined]
      case 17 /* CompletionItemKind.File */:
        return [20 /* monaco.languages.CompletionItemKind.File */, undefined]
      case 18 /* CompletionItemKind.Reference */:
        return [
          21 /* monaco.languages.CompletionItemKind.Reference */,
          undefined,
        ]
      case 19 /* CompletionItemKind.Folder */:
        return [23 /* monaco.languages.CompletionItemKind.Folder */, undefined]
      case 20 /* CompletionItemKind.EnumMember */:
        return [
          16 /* monaco.languages.CompletionItemKind.EnumMember */,
          undefined,
        ]
      case 21 /* CompletionItemKind.Constant */:
        return [
          14 /* monaco.languages.CompletionItemKind.Constant */,
          undefined,
        ]
      case 22 /* CompletionItemKind.Struct */:
        return [6 /* monaco.languages.CompletionItemKind.Struct */, undefined]
      case 23 /* CompletionItemKind.Event */:
        return [10 /* monaco.languages.CompletionItemKind.Event */, undefined]
      case 24 /* CompletionItemKind.Operator */:
        return [
          11 /* monaco.languages.CompletionItemKind.Operator */,
          undefined,
        ]
      case 25 /* CompletionItemKind.TypeParameter */:
        return [
          24 /* monaco.languages.CompletionItemKind.TypeParameter */,
          undefined,
        ]
      default:
        return [value - 1, undefined]
    }
  }
  return [1 /* CompletionItemKind.Text */, value]
}

export function asCompletionItem(item, defaultRange) {
  const result = { label: item.label }
  if (item.detail) {
    result.detail = item.detail
  }
  if (item.documentation) {
    result.documentation = asDocumentation(item.documentation)
    result.documentationFormat = Is.string(item.documentation)
      ? undefined
      : item.documentation.kind
  }
  if (item.filterText) {
    result.filterText = item.filterText
  }
  const insertText = asCompletionInsertText(item, defaultRange)
  result.insertText = insertText.insertText
  result.range = insertText.range
  result.fromEdit = insertText.fromEdit
  if (insertText.isSnippet) {
    result.insertTextRules = 4 // monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
  }
  if (Is.number(item.kind)) {
    let [itemKind, original] = asCompletionItemKind(item.kind)
    result.kind = itemKind
    if (original) {
      result.originalItemKind = original
    }
  }
  if (item.sortText) {
    result.sortText = item.sortText
  }
  if (item.additionalTextEdits) {
    result.additionalTextEdits = asTextEdits(item.additionalTextEdits)
  }
  if (Is.stringArray(item.commitCharacters)) {
    result.commitCharacters = item.commitCharacters.slice()
  }
  if (item.command) {
    result.command = asCommand(item.command)
  }
  if (item.deprecated === true || item.deprecated === false) {
    result.deprecated = item.deprecated
  }
  if (item.preselect === true || item.preselect === false) {
    result.preselect = item.preselect
  }
  if (item.data !== undefined) {
    result.data = item.data
  }
  if (item.deprecated === true || item.deprecated === false) {
    result.deprecated = item.deprecated
  }
  return result
}

function asTextEdit(edit) {
  if (!edit) {
    return undefined
  }
  const range = asRange(edit.range)
  return {
    range,
    text: edit.newText,
  }
}

function asTextEdits(items) {
  if (!items) {
    return undefined
  }
  return items.map((item) => asTextEdit(item))
}

export function asRange(range) {
  if (range === undefined) {
    return undefined
  }
  if (range === null) {
    return null
  }
  const start = asPosition(range.start)
  const end = asPosition(range.end)
  // if (start instanceof monaco.Position && end instanceof monaco.Position) {
  //   return new monaco.Range(
  //     start.lineNumber,
  //     start.column,
  //     end.lineNumber,
  //     end.column
  //   )
  // }
  const startLineNumber =
    !start || start.lineNumber === undefined ? undefined : start.lineNumber
  const startColumn =
    !start || start.column === undefined ? undefined : start.column
  const endLineNumber =
    !end || end.lineNumber === undefined ? undefined : end.lineNumber
  const endColumn = !end || end.column === undefined ? undefined : end.column
  return { startLineNumber, startColumn, endLineNumber, endColumn }
}

function asCommand(command) {
  if (!command) {
    return undefined
  }
  return {
    id: command.command,
    title: command.title,
    arguments: command.arguments,
  }
}

export function asDiagnostics(diagnostics) {
  if (!diagnostics) {
    return undefined
  }
  return diagnostics.map((diagnostic) => asDiagnostic(diagnostic))
}

function asDiagnostic(diagnostic) {
  return {
    code:
      typeof diagnostic.code === 'number'
        ? diagnostic.code.toString()
        : diagnostic.code,
    severity: asSeverity(diagnostic.severity),
    message: diagnostic.message,
    source: diagnostic.source,
    startLineNumber: diagnostic.range.start.line + 1,
    startColumn: diagnostic.range.start.character + 1,
    endLineNumber: diagnostic.range.end.line + 1,
    endColumn: diagnostic.range.end.character + 1,
    relatedInformation: asRelatedInformations(diagnostic.relatedInformation),
  }
}

function asSeverity(severity) {
  if (severity === 1) {
    return 8 /* monaco.MarkerSeverity.Error */
  }
  if (severity === 2) {
    return 4 /* monaco.MarkerSeverity.Warning */
  }
  if (severity === 3) {
    return 2 /* monaco.MarkerSeverity.Info */
  }
  return 1 /* monaco.MarkerSeverity.Hint */
}

function asRelatedInformations(relatedInformation) {
  if (!relatedInformation) {
    return undefined
  }
  return relatedInformation.map((item) => asRelatedInformation(item))
}

function asRelatedInformation(relatedInformation) {
  return {
    // resource: monaco.Uri.parse(relatedInformation.location.uri),
    resource: relatedInformation.location.uri,
    startLineNumber: relatedInformation.location.range.start.line + 1,
    startColumn: relatedInformation.location.range.start.character + 1,
    endLineNumber: relatedInformation.location.range.end.line + 1,
    endColumn: relatedInformation.location.range.end.character + 1,
    message: relatedInformation.message,
  }
}

export function asHover(hover) {
  if (!hover) {
    return undefined
  }
  return {
    contents: asHoverContent(hover.contents),
    range: asRange(hover.range),
  }
}

function asHoverContent(contents) {
  if (Array.isArray(contents)) {
    return contents.map((content) => asMarkdownString(content))
  }
  return [asMarkdownString(contents)]
}
