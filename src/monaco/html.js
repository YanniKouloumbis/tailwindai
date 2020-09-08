import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'

export function setupHtmlMode(content, onChange, worker, getEditor) {
  const disposables = []

  disposables.push(
    monaco.languages.registerCompletionItemProvider('html', {
      triggerCharacters: [' ', '"'],
      provideCompletionItems: async function (model, position) {
        if (!worker.current) return { suggestions: [] }
        const { canceled, error, completions } = await worker.current.emit({
          completions: model.getValueInRange({
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          }),
        })
        if (canceled || error) return { suggestions: [] }
        return {
          suggestions: completions,
        }
      },
      resolveCompletionItem(model, _position, item, _token) {
        const selections = getEditor().getSelections()
        let lines = model.getValue().split('\n')

        for (let i = 0; i < selections.length; i++) {
          const index = selections[i].positionLineNumber - 1
          lines[index] =
            lines[index].substr(0, item.range.startColumn - 1) +
            item.label +
            lines[index].substr(selections[i].positionColumn - 1)
        }

        onChange(lines.join('\n'))

        throw 'error but not really'
      },
    })
  )

  // reset preview when suggest widget is closed
  let timeoutId
  function attachOnDidHide() {
    const editor = getEditor()
    if (editor && editor._contentWidgets['editor.widget.suggestWidget']) {
      editor._contentWidgets[
        'editor.widget.suggestWidget'
      ].widget.onDidHide(() => onChange())
    } else {
      timeoutId = window.setTimeout(attachOnDidHide, 10)
    }
  }
  attachOnDidHide()
  disposables.push({
    dispose: () => {
      window.clearTimeout(timeoutId)
    },
  })

  const model = monaco.editor.createModel(
    content || '',
    'html',
    'file:///index.html'
  )
  model.updateOptions({ indentSize: 2, tabSize: 2 })
  disposables.push(model)
  disposables.push(model.onDidChangeContent(() => onChange()))

  return {
    model,
    dispose() {
      disposables.forEach(async (disposable) => (await disposable).dispose())
    },
  }
}
