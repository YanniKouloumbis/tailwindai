import { useRef, useEffect } from 'react'
import { createMonacoEditor } from '../monaco'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'

export default function Editor({
  initialContent = {},
  onChange,
  worker,
  activeTab,
  editorRef: inRef
}) {
  const editorContainerRef = useRef()
  const editorRef = useRef()
  const editorState = useRef({})

  useEffect(() => {
    const editor = createMonacoEditor({
      container: editorContainerRef.current,
      initialContent,
      onChange,
      worker,
    })

    editorRef.current = editor
    inRef(editor)

    return () => {
      editorRef.current.dispose()
    }
  }, [initialContent, onChange, worker, inRef])

  useEffect(() => {
    const target = document.querySelector('html')

    const observer = new MutationObserver((mutationsList) => {
      for (let mutation of mutationsList) {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'class'
        ) {
          if (target.classList.contains('dark')) {
            monaco.editor.setTheme('vs-dark')
          } else {
            monaco.editor.setTheme('vs')
          }
        }
      }
    })

    observer.observe(target, { attributes: true })

    return () => {
      observer.disconnect()
    }
  }, [])

  // TODO: polyfill?
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      window.setTimeout(() => editorRef.current.editor.layout(), 0)
    })
    observer.observe(editorContainerRef.current)
    return () => {
      observer.disconnect()
    }
  }, [])

  // TODO: prevent initial run?
  useEffect(() => {
    const { editor, documents } = editorRef.current
    const currentState = editor.saveViewState()
    const currentModel = editor.getModel()

    if (currentModel === documents.html.model) {
      editorState.current.html = currentState
    } else if (currentModel === documents.css.model) {
      editorState.current.css = currentState
    } else if (currentModel === documents.config.model) {
      editorState.current.config = currentState
    }

    editor.setModel(documents[activeTab].model)
    editor.restoreViewState(editorState.current[activeTab])
    editor.focus()
  }, [activeTab])

  return (
    <div className="relative flex-auto">
      <div
        ref={editorContainerRef}
        className="absolute inset-0 w-full h-full"
      />
    </div>
  )
}
