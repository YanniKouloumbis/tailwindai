import { useRef, useEffect } from 'react'
import { createMonacoEditor } from '../monaco'

export default function Editor({
  initialContent = {},
  onChange,
  worker,
  activeTab,
}) {
  const editorContainerRef = useRef()
  const editorRef = useRef()
  const editorState = useRef({})

  useEffect(() => {
    editorRef.current = createMonacoEditor({
      container: editorContainerRef.current,
      initialContent,
      onChange,
      worker,
    })

    return () => {
      editorRef.current.dispose()
    }
  }, [initialContent, onChange, worker])

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
    const { editor, models } = editorRef.current
    const currentState = editor.saveViewState()
    const currentModel = editor.getModel()

    if (currentModel === models.html) {
      editorState.current.html = currentState
    } else if (currentModel === models.css) {
      editorState.current.css = currentState
    } else if (currentModel === models.config) {
      editorState.current.config = currentState
    }

    editor.setModel(models[activeTab])
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
