import { useRef, useEffect, useState } from 'react'
import { createMonacoEditor } from '../monaco'

export default function Editor({ initialContent = {}, onChange, worker }) {
  const editorContainerRef = useRef()
  const editorRef = useRef()
  const editorState = useRef({})
  const [activeTab, setActiveTab] = useState('html')

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
  }, [initialContent, onChange])

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
    <>
      <div className="flex flex-none px-8 py-2 space-x-3 border-b border-gray-200">
        <button
          type="button"
          className={`rounded-md text-sm leading-6 font-medium px-2 focus:outline-none transition-colors duration-150 ${
            activeTab === 'html'
              ? 'text-black bg-gray-100 focus:bg-gray-200'
              : 'text-gray-500 focus:text-black'
          }`}
          onClick={() => setActiveTab('html')}
        >
          HTML
        </button>
        <button
          type="button"
          className={`rounded-md text-sm leading-6 font-medium px-2 focus:outline-none transition-colors duration-150 ${
            activeTab === 'css'
              ? 'text-black bg-gray-100 focus:bg-gray-200'
              : 'text-gray-500 focus:text-black'
          }`}
          onClick={() => setActiveTab('css')}
        >
          CSS
        </button>
        <button
          type="button"
          className={`rounded-md text-sm leading-6 font-medium px-2 focus:outline-none transition-colors duration-150 ${
            activeTab === 'config'
              ? 'text-black bg-gray-100 focus:bg-gray-200'
              : 'text-gray-500 focus:text-black'
          }`}
          onClick={() => setActiveTab('config')}
        >
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
