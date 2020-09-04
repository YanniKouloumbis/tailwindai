import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import PrettierWorker from 'worker-loader?publicPath=/_next/&filename=static/[name].[hash].js&chunkFilename=static/chunks/[id].[contenthash].worker.js!../workers/prettier.worker.js'
import { createWorkerQueue } from '../utils/createWorkerQueue'
import { setupHtmlMode } from './html'
import { setupCssMode } from './css'
import { setupJavaScriptMode } from './javascript'

export function createMonacoEditor({ container, initialContent, onChange }) {
  const disposables = []

  window.MonacoEnvironment.getWorkerUrl = (_moduleId, label) => {
    if (label === 'css' || label === 'tailwindcss')
      return '_next/static/css.worker.js'
    if (label === 'html') return '_next/static/html.worker.js'
    if (label === 'typescript' || label === 'javascript')
      return '_next/static/ts.worker.js'
    return '_next/static/editor.worker.js'
  }

  disposables.push(registerDocumentFormattingEditProviders())

  const html = setupHtmlMode(initialContent.html, () => {
    triggerOnChange('html')
  })
  disposables.push(html)

  const css = setupCssMode(initialContent.css, () => {
    triggerOnChange('css')
  })
  disposables.push(css)

  const config = setupJavaScriptMode(initialContent.config, () => {
    triggerOnChange('config')
  })
  disposables.push(config)

  const editor = monaco.editor.create(container, {
    minimap: { enabled: false },
  })
  disposables.push(editor)

  editor.setModel(html.model)

  setupKeybindings(editor)

  function triggerOnChange(id) {
    if (onChange) {
      onChange(id, {
        html: html.model.getValue(),
        css: css.model.getValue(),
        config: config.model.getValue(),
      })
    }
  }

  return {
    editor,
    models: {
      html: html.model,
      css: css.model,
      config: config.model,
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
