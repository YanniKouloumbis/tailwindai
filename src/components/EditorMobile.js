import { useRef, useEffect, useLayoutEffect, useState } from 'react'
import CodeMirror from 'codemirror'
import { tailwindcssMode } from '../codemirror/tailwindcssMode'
require('codemirror/mode/htmlmixed/htmlmixed')
require('codemirror/mode/javascript/javascript')

CodeMirror.defineMode('tailwindcss', tailwindcssMode)

const docToMode = {
  html: 'htmlmixed',
  css: 'tailwindcss',
  config: 'javascript',
}

const modeToDoc = {
  htmlmixed: 'html',
  tailwindcss: 'css',
  javascript: 'config',
}

export default function EditorMobile2({
  initialContent,
  onChange,
  activeTab,
  editorRef: inRef,
}) {
  const ref = useRef()
  const cmRef = useRef()
  const content = useRef(initialContent)
  const history = useRef({})
  const [i, setI] = useState(0)

  useEffect(() => {
    cmRef.current = CodeMirror(ref.current, {
      value: initialContent[activeTab],
      mode: docToMode[activeTab],
      lineNumbers: true,
      viewportMargin: Infinity,
      tabSize: 2,
    })
    inRef({
      getValue(doc) {
        return content.current[doc]
      },
    })
  }, [])

  useEffect(() => {
    function handleChange() {
      content.current[activeTab] = cmRef.current.getValue()
      onChange(activeTab, content.current)
    }
    cmRef.current.on('change', handleChange)
    return () => {
      cmRef.current.off('change', handleChange)
    }
  }, [activeTab, onChange])

  useEffect(() => {
    history.current[
      modeToDoc[cmRef.current.getOption('mode')]
    ] = cmRef.current.getHistory()

    cmRef.current.setValue(content.current[activeTab])
    cmRef.current.setOption('mode', docToMode[activeTab])
    if (history.current[activeTab]) {
      cmRef.current.setHistory(history.current[activeTab])
    } else {
      cmRef.current.clearHistory()
    }
    setI((i) => i + 1)
  }, [activeTab])

  useLayoutEffect(() => {
    if (!cmRef.current) return
    cmRef.current.refresh()
    cmRef.current.focus()
  }, [i])

  useEffect(() => {
    const target = document.querySelector('html')

    const observer = new MutationObserver((mutationsList) => {
      for (let mutation of mutationsList) {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'class'
        ) {
          if (target.classList.contains('dark')) {
            cmRef.current.setOption('theme', 'material')
          } else {
            cmRef.current.setOption('theme', 'default')
          }
        }
      }
    })

    observer.observe(target, { attributes: true })

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <div className="relative flex-auto">
      <div ref={ref} className="absolute inset-0 w-full h-full" />
    </div>
  )
}
