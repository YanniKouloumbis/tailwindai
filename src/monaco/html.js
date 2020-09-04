import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'

export function setupHtmlMode(content, onChange) {
  const disposables = []

  const model = monaco.editor.createModel(
    content || '',
    'html',
    'file:///index.html'
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
