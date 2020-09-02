import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import { useRef, useEffect } from 'react'

export default function Editor({ content = {}, onChange = () => {} }) {
  const editorContainerRef = useRef()
  const editorRef = useRef()

  const documents = useRef({})
  const preventUpdate = useRef(false)

  useEffect(() => {
    function onResize() {
      if (editorRef.current) {
        editorRef.current.layout()
      }
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
    }
  }, [])

  useEffect(() => {
    const listeners = []

    function onDidChangeContent() {
      if (preventUpdate.current) return
      onChange({
        html: documents.current.html.model.getValue(),
        css: documents.current.css.model.getValue(),
        config: documents.current.config.model.getValue(),
      })
    }

    editorRef.current = monaco.editor.create(editorContainerRef.current, {
      minimap: { enabled: false },
    })

    documents.current.html = {
      model: monaco.editor.createModel(
        content.html || '',
        'html',
        'file:///index.html'
      ),
    }
    listeners.push(
      documents.current.html.model.onDidChangeContent(onDidChangeContent)
    )
    documents.current.css = {
      model: monaco.editor.createModel(
        content.css || '',
        'css',
        'file:///main.css'
      ),
    }
    listeners.push(
      documents.current.css.model.onDidChangeContent(onDidChangeContent)
    )
    documents.current.config = {
      model: monaco.editor.createModel(
        content.config || '',
        'javascript',
        'file:///tailwind.config.js'
      ),
    }
    listeners.push(
      documents.current.config.model.onDidChangeContent(onDidChangeContent)
    )

    monaco.languages.css.cssDefaults.setDiagnosticsOptions({
      validate: false,
    })

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

    monaco.languages.typescript.javascriptDefaults.addExtraLib(
      'export interface Config { theme: string }',
      'file:///node_modules/@types/tailwindcss/index.d.ts'
    )

    editorRef.current.setModel(documents.current.html.model)

    return () => {
      editorRef.current.dispose()
      documents.current.html.model.dispose()
      documents.current.css.model.dispose()
      documents.current.config.model.dispose()
      listeners.forEach((listener) => listener.dispose())
    }
  }, [])

  useEffect(() => {
    preventUpdate.current = true
    if (content.html !== documents.current.html.model.getValue()) {
      documents.current.html.model.pushEditOperations(
        [],
        [
          {
            range: documents.current.html.model.getFullModelRange(),
            text: content.html,
          },
        ]
      )
    }
    if (content.css !== documents.current.css.model.getValue()) {
      documents.current.css.model.pushEditOperations(
        [],
        [
          {
            range: documents.current.css.model.getFullModelRange(),
            text: content.css,
          },
        ]
      )
    }
    if (content.config !== documents.current.config.model.getValue()) {
      documents.current.config.model.pushEditOperations(
        [],
        [
          {
            range: documents.current.config.model.getFullModelRange(),
            text: content.config,
          },
        ]
      )
    }
    preventUpdate.current = false
  }, [content.html, content.css, content.config])

  function switchTab(document) {
    const currentState = editorRef.current.saveViewState()
    const currentModel = editorRef.current.getModel()

    if (currentModel === documents.current.html.model) {
      documents.current.html.state = currentState
    } else if (currentModel === documents.current.css.model) {
      documents.current.css.state = currentState
    } else if (currentModel === documents.current.config.model) {
      documents.current.config.state = currentState
    }

    editorRef.current.setModel(documents.current[document].model)
    editorRef.current.restoreViewState(documents.current[document].state)
    editorRef.current.focus()
  }

  return (
    <>
      <div className="flex flex-none p-5 space-x-5">
        <button type="button" onClick={() => switchTab('html')}>
          HTML
        </button>
        <button type="button" onClick={() => switchTab('css')}>
          CSS
        </button>
        <button type="button" onClick={() => switchTab('config')}>
          Config
        </button>
      </div>
      <div className="relative flex-auto">
        <div
          ref={editorContainerRef}
          className="absolute inset-0 w-full h-full"
        />
      </div>
    </>
  )
}
