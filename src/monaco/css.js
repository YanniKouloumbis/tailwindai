import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'

export function setupCssMode(content, onChange) {
  const disposables = []

  const model = monaco.editor.createModel(
    content || '',
    'css',
    'file:///main.css'
  )
  disposables.push(model)
  disposables.push(model.onDidChangeContent(onChange))

  return {
    model,
    dispose() {
      disposables.forEach((disposable) => disposable.dispose())
    },
  }
}
