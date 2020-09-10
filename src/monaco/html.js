import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import { supplementMarkers } from './supplementMarkers'
import { renderColorDecorators } from './renderColorDecorators'
import { requestResponse } from '../utils/workers'
import { debounce } from 'debounce'

const HTML_URI = 'file:///HTML'

export function setupHtmlMode(content, onChange, worker, getEditor) {
  const disposables = []

  disposables.push(
    monaco.languages.registerCompletionItemProvider('html', {
      triggerCharacters: [' ', '"'],
      provideCompletionItems: async function (model, position) {
        if (!worker.current) return { suggestions: [] }
        const { result } = await requestResponse(worker.current, {
          lsp: {
            type: 'complete',
            text: model.getValue(),
            language: 'html',
            uri: HTML_URI,
            position,
          },
        })
        return result ? result : { suggestions: [] }
      },
      async resolveCompletionItem(model, _position, item, _token) {
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

        if (!item._resolved) {
          let { result } = await requestResponse(worker.current, {
            lsp: {
              type: 'resolveCompletionItem',
              item,
            },
          })
          Object.assign(item, result, { _resolved: true })
        }

        const error = new Error('Canceled')
        error.name = error.message
        throw error
      },
    })
  )

  disposables.push(
    monaco.languages.registerHoverProvider('html', {
      provideHover: async (model, position) => {
        let { result } = await requestResponse(worker.current, {
          lsp: {
            type: 'hover',
            text: model.getValue(),
            language: 'html',
            uri: HTML_URI,
            position,
          },
        })
        return result
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

  const model = monaco.editor.createModel(content || '', 'html', HTML_URI)
  model.updateOptions({ indentSize: 2, tabSize: 2 })
  disposables.push(model)

  const updateDecorations = debounce(async () => {
    let { result: colors } = await requestResponse(worker.current, {
      lsp: {
        type: 'documentColors',
        text: model.getValue(),
        language: 'html',
        uri: HTML_URI,
      },
    })
    renderColorDecorators(getEditor(), model, colors)

    let { result } = await requestResponse(worker.current, {
      lsp: {
        type: 'validate',
        text: model.getValue(),
        language: 'html',
        uri: HTML_URI,
      },
    })

    if (model.isDisposed()) return

    if (result) {
      monaco.editor.setModelMarkers(model, 'default', supplementMarkers(result))
    } else {
      monaco.editor.setModelMarkers(model, 'default', [])
    }
  }, 100)

  updateDecorations()

  disposables.push(
    model.onDidChangeContent(() => {
      onChange()
      updateDecorations()
    })
  )

  return {
    model,
    updateDecorations,
    dispose() {
      disposables.forEach(async (disposable) => (await disposable).dispose())
    },
  }
}
