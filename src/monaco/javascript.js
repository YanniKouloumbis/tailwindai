import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import { SuggestAdapter } from 'monaco-editor/esm/vs/language/typescript/languageFeatures'
import types from '!!raw-loader!../monaco/types.d.ts'
import { DiagnosticsAdapter } from 'monaco-editor/esm/vs/language/typescript/languageFeatures'

const CONFIG_URI = 'file:///Config'
const CONFIG_PROXY_URI = 'file:///Config.proxy'

export function setupJavaScriptMode(content, onChange) {
  const disposables = []

  const _doValidate = DiagnosticsAdapter.prototype._doValidate
  DiagnosticsAdapter.prototype._doValidate = function (originalModel) {
    return _doValidate.bind(this)(
      originalModel === model ? proxyModel : originalModel
    )
  }
  disposables.push({
    dispose() {
      DiagnosticsAdapter.prototype._doValidate = _doValidate
    },
  })

  const _setModelMarkers = monaco.editor.setModelMarkers
  monaco.editor.setModelMarkers = (originalModel, owner, markers) => {
    return _setModelMarkers(
      originalModel === proxyModel ? model : originalModel,
      owner,
      originalModel === proxyModel
        ? markers.map((marker) => ({
            ...marker,
            startLineNumber: marker.startLineNumber - 1,
            endLineNumber: marker.endLineNumber - 1,
            relatedInformation: [],
          }))
        : markers
    )
  }
  disposables.push({
    dispose() {
      monaco.editor.setModelMarkers = _setModelMarkers
    },
  })

  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: false,
    diagnosticCodesToIgnore: [
      80001, // "File is a CommonJS module; it may be converted to an ES6 module."
      2307, // "Cannot find module 'x'."
    ],
  })

  monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
    allowJs: true,
    allowNonTsExtensions: true,
    module: 1,
    target: 99,
    checkJs: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    typeRoots: ['node_modules/@types'],
  })

  disposables.push(
    monaco.languages.typescript.javascriptDefaults.addExtraLib(
      types,
      'file:///node_modules/@types/tailwindcss/index.d.ts'
    )
  )

  const model = monaco.editor.createModel(
    content || '',
    'javascript',
    CONFIG_URI
  )
  model.updateOptions({ indentSize: 2, tabSize: 2 })
  disposables.push(model)

  const proxyModel = monaco.editor.createModel(
    addTypeAnnotationToJs(content || ''),
    'javascript',
    CONFIG_PROXY_URI
  )
  proxyModel.updateOptions({ indentSize: 2, tabSize: 2 })
  disposables.push(proxyModel)

  disposables.push(
    model.onDidChangeContent(() => {
      onChange()
      proxyModel.setValue(addTypeAnnotationToJs(model.getValue()))
    })
  )

  const _provideCompletionItems =
    SuggestAdapter.prototype.provideCompletionItems
  SuggestAdapter.prototype.provideCompletionItems = async function (
    originalModel,
    position,
    ...rest
  ) {
    if (!this._provideCompletionItems) {
      this._provideCompletionItems = _provideCompletionItems.bind(this)
    }
    const result = await this._provideCompletionItems(
      originalModel === model ? proxyModel : originalModel,
      originalModel === model ? position.delta(1) : position,
      ...rest
    )
    if (!result) return result
    return {
      suggestions:
        originalModel === model
          ? result.suggestions.map((suggestion) => ({
              ...suggestion,
              uri: model.uri,
              range: new monaco.Range(
                suggestion.range.startLineNumber - 1,
                suggestion.range.startColumn,
                suggestion.range.endLineNumber - 1,
                suggestion.range.endColumn
              ),
            }))
          : result.suggestions,
    }
  }
  disposables.push({
    dispose() {
      SuggestAdapter.prototype.provideCompletionItems = _provideCompletionItems
    },
  })

  return {
    model,
    dispose() {
      disposables.forEach((disposable) => disposable.dispose())
    },
  }
}

function addTypeAnnotationToJs(js) {
  return (
    js.replace(
      /^(\s*)module\.exports(\s*=)/m,
      '$1/** @type {import("tailwindcss").TailwindConfig} */\nconst _exports$2'
    ) + '\n;_exports' // prevent "_exports is declared but its value is never read."
  )
}
