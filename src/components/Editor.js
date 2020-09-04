import { useRef, useEffect } from 'react'
import { createMonacoEditor } from '../monaco'

export default function Editor({ initialContent = {}, onChange }) {
  const editorContainerRef = useRef()
  const editorRef = useRef()
  const editorState = useRef({})

  useEffect(() => {
    function onResize() {
      if (editorRef.current) {
        editorRef.current.editor.layout()
      }
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
    }
  }, [])

  useEffect(() => {
    editorRef.current = createMonacoEditor({
      container: editorContainerRef.current,
      initialContent,
      onChange,
    })

    return () => {
      editorRef.current.dispose()
    }
  }, [initialContent, onChange])

  function switchTab(document) {
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

    editor.setModel(models[document])
    editor.restoreViewState(editorState.current[document])
    editor.focus()
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
