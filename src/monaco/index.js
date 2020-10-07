import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import PrettierWorker from 'worker-loader?publicPath=/_next/&filename=static/chunks/[name].[hash].js&chunkFilename=static/chunks/[id].[contenthash].worker.js!../workers/prettier.worker.js'
import { createWorkerQueue } from '../utils/workers'
import { setupHtmlMode } from './html'
import { setupCssMode } from './css'
import { setupJavaScriptMode } from './javascript'
import { getTheme } from '../utils/theme'
import versions from '../preval/versions'

export function createMonacoEditor({
  container,
  initialContent,
  onChange,
  worker,
}) {
  let editor
  const disposables = []
  let shouldTriggerOnChange = true

  window.MonacoEnvironment.getWorkerUrl = (_moduleId, label) => {
    const v = `?v=${versions['monaco-editor']}`
    if (label === 'css' || label === 'tailwindcss')
      return `_next/static/chunks/css.worker.js${v}`
    if (label === 'html') return `_next/static/chunks/html.worker.js${v}`
    if (label === 'typescript' || label === 'javascript')
      return `_next/static/chunks/ts.worker.js${v}`
    return `_next/static/chunks/editor.worker.js${v}`
  }

  disposables.push(registerDocumentFormattingEditProviders())

  const html = setupHtmlMode(
    initialContent.html,
    (newContent) => {
      triggerOnChange('html', newContent)
    },
    worker,
    () => editor
  )
  disposables.push(html)

  const css = setupCssMode(
    initialContent.css,
    () => {
      triggerOnChange('css')
    },
    worker,
    () => editor
  )
  disposables.push(css)

  const config = setupJavaScriptMode(
    initialContent.config,
    () => {
      triggerOnChange('config')
    },
    () => editor
  )
  disposables.push(config)

  monaco.editor.defineTheme('tw-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [{ background: '18181b' }],
    colors: {
      'editor.background': '#18181b',
    },
  })

  editor = monaco.editor.create(container, {
    fontFamily:
      'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: 14,
    lineHeight: 21,
    minimap: { enabled: false },
    theme: getTheme() === 'dark' ? 'tw-dark' : 'vs',
  })
  disposables.push(editor)

  setupKeybindings(editor)

  function triggerOnChange(id, newContent) {
    if (onChange && shouldTriggerOnChange) {
      onChange(id, {
        html:
          id === 'html' && typeof newContent !== 'undefined'
            ? newContent
            : html.getModel()?.getValue() ?? initialContent.html,
        css:
          id === 'css' && typeof newContent !== 'undefined'
            ? newContent
            : css.getModel()?.getValue() ?? initialContent.css,
        config:
          id === 'config' && typeof newContent !== 'undefined'
            ? newContent
            : config.getModel()?.getValue() ?? initialContent.config,
      })
    }
  }

  worker.current.addEventListener('message', (event) => {
    if (event.data.css) {
      const currentModel = editor.getModel()
      if (currentModel === html.getModel()) {
        html.updateDecorations()
      } else if (currentModel === css.getModel()) {
        css.updateDecorations()
      }
    }
  })

  editor.onDidChangeModel(() => {
    const currentModel = editor.getModel()
    if (currentModel === html.getModel()) {
      html.updateDecorations()
    } else if (currentModel === css.getModel()) {
      css.updateDecorations()
    }
  })

  const documents = { html, css, config }

  return {
    editor,
    documents,
    getValue(doc) {
      return documents[doc].getModel()?.getValue() ?? initialContent[doc]
    },
    reset(content) {
      shouldTriggerOnChange = false
      initialContent = content
      if (documents.html.getModel()) {
        documents.html.getModel().setValue(content.html)
      }
      if (documents.css.getModel()) {
        documents.css.getModel().setValue(content.css)
      }
      if (documents.config.getModel()) {
        documents.config.getModel().setValue(content.config)
      }
      window.setTimeout(() => {
        shouldTriggerOnChange = true
      }, 0)
    },
    dispose() {
      disposables.forEach((disposable) => disposable.dispose())
    },
  }
}

function setupKeybindings(editor) {
  editor._standaloneKeybindingService.addDynamicKeybinding(
    '-editor.action.formatDocument'
  )
  editor._standaloneKeybindingService.addDynamicKeybinding(
    'editor.action.formatDocument',
    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S
  )
}

function registerDocumentFormattingEditProviders() {
  const disposables = []
  let prettierWorker

  const formattingEditProvider = {
    async provideDocumentFormattingEdits(model, _options, _token) {
      if (!prettierWorker) {
        prettierWorker = createWorkerQueue(PrettierWorker)
      }
      const { canceled, error, pretty } = await prettierWorker.emit({
        text: model.getValue(),
        language: model.getModeId(),
      })
      if (canceled || error) return []
      return [
        {
          range: model.getFullModelRange(),
          text: pretty,
        },
      ]
    },
  }

  // override the built-in HTML formatter
  const _registerDocumentFormattingEditProvider =
    monaco.languages.registerDocumentFormattingEditProvider
  monaco.languages.registerDocumentFormattingEditProvider = (id, provider) => {
    if (id !== 'html') {
      return _registerDocumentFormattingEditProvider(id, provider)
    }
    return _registerDocumentFormattingEditProvider(
      'html',
      formattingEditProvider
    )
  }
  disposables.push(
    monaco.languages.registerDocumentFormattingEditProvider(
      'tailwindcss',
      formattingEditProvider
    )
  )
  disposables.push(
    monaco.languages.registerDocumentFormattingEditProvider(
      'javascript',
      formattingEditProvider
    )
  )

  return {
    dispose() {
      disposables.forEach((disposable) => disposable.dispose())
      if (prettierWorker) {
        prettierWorker.terminate()
      }
    },
  }
}
