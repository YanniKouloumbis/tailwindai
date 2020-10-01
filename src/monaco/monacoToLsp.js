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

export function asCompletionItem(item) {
  const result = { label: item.label }
  const protocolItem = /* ProtocolCompletionItem.is(item) ? item :*/ undefined
  if (item.detail) {
    result.detail = item.detail
  }
  // We only send items back we created. So this can't be something else than
  // a string right now.
  if (item.documentation) {
    if (!protocolItem || !protocolItem.documentationFormat) {
      result.documentation = item.documentation
    } else {
      result.documentation = asDocumentation(
        protocolItem.documentationFormat,
        item.documentation
      )
    }
  }
  if (item.filterText) {
    result.filterText = item.filterText
  }
  fillPrimaryInsertText(result, item)
  if (Is.number(item.kind)) {
    result.kind = asCompletionItemKind(
      item.kind,
      protocolItem && protocolItem.originalItemKind
    )
  }
  if (item.sortText) {
    result.sortText = item.sortText
  }
  if (item.additionalTextEdits) {
    result.additionalTextEdits = asTextEdits(item.additionalTextEdits)
  }
  if (item.command) {
    result.command = asCommand(item.command)
  }
  if (item.commitCharacters) {
    result.commitCharacters = item.commitCharacters.slice()
  }
  if (item.command) {
    result.command = asCommand(item.command)
  }
  if (item.data) {
    result.data = item.data
  }
  // TODO if (item.preselect === true || item.preselect === false) { result.preselect = item.preselect; }
  if (protocolItem) {
    if (protocolItem.data !== undefined) {
      result.data = protocolItem.data
    }
    if (protocolItem.deprecated === true || protocolItem.deprecated === false) {
      result.deprecated = protocolItem.deprecated
    }
  }
  return result
}

function asCompletionItemKind(value, original) {
  if (original !== undefined) {
    return original
  }
  switch (value) {
    case 0 /* monaco.languages.CompletionItemKind.Method */:
      return 2 /* CompletionItemKind.Method */
    case 1 /* monaco.languages.CompletionItemKind.Function */:
      return 3 /* CompletionItemKind.Function */
    case 2 /* monaco.languages.CompletionItemKind.Constructor */:
      return 4 /* CompletionItemKind.Constructor */
    case 3 /* monaco.languages.CompletionItemKind.Field */:
      return 5 /* CompletionItemKind.Field */
    case 4 /* monaco.languages.CompletionItemKind.Variable */:
      return 6 /* CompletionItemKind.Variable */
    case 5 /* monaco.languages.CompletionItemKind.Class */:
      return 7 /* CompletionItemKind.Class */
    case 6 /* monaco.languages.CompletionItemKind.Struct */:
      return 22 /* CompletionItemKind.Struct */
    case 7 /* monaco.languages.CompletionItemKind.Interface */:
      return 8 /* CompletionItemKind.Interface */
    case 8 /* monaco.languages.CompletionItemKind.Module */:
      return 9 /* CompletionItemKind.Module */
    case 9 /* monaco.languages.CompletionItemKind.Property */:
      return 10 /* CompletionItemKind.Property */
    case 10 /* monaco.languages.CompletionItemKind.Event */:
      return 23 /* CompletionItemKind.Event */
    case 11 /* monaco.languages.CompletionItemKind.Operator */:
      return 24 /* CompletionItemKind.Operator */
    case 12 /* monaco.languages.CompletionItemKind.Unit */:
      return 11 /* CompletionItemKind.Unit */
    case 13 /* monaco.languages.CompletionItemKind.Value */:
      return 12 /* CompletionItemKind.Value */
    case 14 /* monaco.languages.CompletionItemKind.Constant */:
      return 21 /* CompletionItemKind.Constant */
    case 15 /* monaco.languages.CompletionItemKind.Enum */:
      return 13 /* CompletionItemKind.Enum */
    case 16 /* monaco.languages.CompletionItemKind.EnumMember */:
      return 20 /* CompletionItemKind.EnumMember */
    case 17 /* monaco.languages.CompletionItemKind.Keyword */:
      return 14 /* CompletionItemKind.Keyword */
    case 18 /* monaco.languages.CompletionItemKind.Text */:
      return 1 /* CompletionItemKind.Text */
    case 19 /* monaco.languages.CompletionItemKind.Color */:
      return 16 /* CompletionItemKind.Color */
    case 20 /* monaco.languages.CompletionItemKind.File */:
      return 17 /* CompletionItemKind.File */
    case 21 /* monaco.languages.CompletionItemKind.Reference */:
      return 18 /* CompletionItemKind.Reference */
    case 22 /* monaco.languages.CompletionItemKind.Customcolor */:
      return 16 /* CompletionItemKind.Color */
    case 23 /* monaco.languages.CompletionItemKind.Folder */:
      return 19 /* CompletionItemKind.Folder */
    case 24 /* monaco.languages.CompletionItemKind.TypeParameter */:
      return 25 /* CompletionItemKind.TypeParameter */
    case 25 /* monaco.languages.CompletionItemKind.Snippet */:
      return 15 /* CompletionItemKind.Snippet */
    default:
      return value + 1
  }
}

function asDocumentation(format, documentation) {
  switch (format) {
    case 'plaintext':
      return { kind: format, value: documentation }
    case 'markdown':
      return { kind: format, value: documentation.value }
    default:
      return `Unsupported Markup content received. Kind is: ${format}`
  }
}

function fillPrimaryInsertText(target, source) {
  let format = 1 /* InsertTextFormat.PlainText */
  let text
  let range
  if (
    source.insertTextRules !== undefined &&
    (source.insertTextRules &
      4) /* monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet*/ ===
      0
  ) {
    format = 2 /* InsertTextFormat.Snippet */
    text = source.insertText
  }
  target.insertTextFormat = format

  text = source.insertText
  if (source.range) {
    range = asRange(source.range)
  }

  target.insertTextFormat = format
  if (source.fromEdit && text && range) {
    target.textEdit = { newText: text, range: range }
  } else {
    target.insertText = text
  }
}

function asTextEdit(edit) {
  const range = asRange(edit.range)
  return {
    range,
    newText: edit.text || '',
  }
}

function asTextEdits(items) {
  if (!items) {
    return undefined
  }
  return items.map((item) => asTextEdit(item))
}

function asCommand(item) {
  if (item) {
    return {
      title: item.title,
      command: item.id,
      arguments: item.arguments || [],
    }
  }
  return undefined
}

function asRange(range) {
  if (range === undefined) {
    return undefined
  }
  if (range === null) {
    return null
  }

  if (isRangeReplace(range)) {
    return asRange(range.insert)
  } else {
    const start = asPosition(range.startLineNumber, range.startColumn)
    const end = asPosition(range.endLineNumber, range.endColumn)
    return {
      start,
      end,
    }
  }
}

function asPosition(lineNumber, column) {
  const line =
    lineNumber === undefined || lineNumber === null ? undefined : lineNumber - 1
  const character =
    column === undefined || column === null ? undefined : column - 1
  return {
    line,
    character,
  }
}

function isRangeReplace(v) {
  return v.insert !== undefined
}
