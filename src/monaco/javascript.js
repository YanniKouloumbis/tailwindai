import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import { SuggestAdapter as DefaultSuggestAdapter } from 'monaco-editor/esm/vs/language/typescript/languageFeatures'
import types from '!!raw-loader!../monaco/types.d.ts'

export function setupJavaScriptMode(content, onChange) {
  const disposables = []

  const model = monaco.editor.createModel(
    content || '',
    'javascript',
    'file:///tailwind.config.js'
  )
  model.updateOptions({ indentSize: 2, tabSize: 2 })
  disposables.push(model)

  const proxyModel = monaco.editor.createModel(
    content || '',
    'javascript',
    'file:///tailwind.config.proxy.js'
  )
  proxyModel.updateOptions({ indentSize: 2, tabSize: 2 })
  disposables.push(proxyModel)

  disposables.push(
    model.onDidChangeContent(() => {
      onChange()
      proxyModel.setValue(addTypeAnnotationToJs(model.getValue()))
    })
  )

  const _registerCompletionItemProvider =
    monaco.languages.registerCompletionItemProvider
  monaco.languages.registerCompletionItemProvider = async (
    language,
    adapter
  ) => {
    if (adapter instanceof DefaultSuggestAdapter) {
      return _registerCompletionItemProvider(
        language,
        new SuggestAdapter(
          await monaco.languages.typescript.getJavaScriptWorker(),
          proxyModel
        )
      )
    }
    return _registerCompletionItemProvider(language, adapter)
  }

  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: false,
    diagnosticCodesToIgnore: [
      80001, // "File is a CommonJS module; it may be converted to an ES6 module."
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

  return {
    model,
    dispose() {
      disposables.forEach((disposable) => disposable.dispose())
    },
  }
}

class SuggestAdapter extends DefaultSuggestAdapter {
  constructor(worker, model) {
    super(worker)
    this.model = model
  }
  async provideCompletionItems(model, position, ...rest) {
    const result = await super.provideCompletionItems(
      this.model,
      position.delta(1),
      ...rest
    )
    if (!result) return result
    return {
      suggestions: result.suggestions.map((suggestion) => ({
        ...suggestion,
        uri: model.uri,
        range: new monaco.Range(
          suggestion.range.startLineNumber - 1,
          suggestion.range.startColumn,
          suggestion.range.endLineNumber - 1,
          suggestion.range.endColumn
        ),
      })),
    }
  }
}

function addTypeAnnotationToJs(js) {
  return js.replace(
    /^(\s*)module\.exports(\s*=)/m,
    '$1/** @type {import("tailwindcss").TailwindConfig} */\nconst _exports$2'
  )
}
