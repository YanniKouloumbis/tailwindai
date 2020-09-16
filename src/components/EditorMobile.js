import { useEffect, useState } from 'react'
import { Controlled as CodeMirror } from 'react-codemirror2'
import { tailwindcssMode } from '../codemirror/tailwindcssMode'
require('codemirror/mode/htmlmixed/htmlmixed')
require('codemirror/mode/javascript/javascript')

const modes = {
  html: 'htmlmixed',
  css: 'tailwindcss',
  config: 'javascript',
}

export default function EditorMobile({ initialContent, onChange, activeTab }) {
  const [content, setContent] = useState({
    html: initialContent.html,
    css: initialContent.css,
    config: initialContent.config,
  })

  const [theme, setTheme] = useState('default')

  useEffect(() => {
    const target = document.querySelector('html')

    const observer = new MutationObserver((mutationsList) => {
      for (let mutation of mutationsList) {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'class'
        ) {
          if (target.classList.contains('dark')) {
            setTheme('material')
          } else {
            setTheme('default')
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
      <CodeMirror
        className="absolute inset-0 w-full h-full"
        value={content[activeTab]}
        options={{
          mode: modes[activeTab],
          theme,
          lineNumbers: true,
          viewportMargin: Infinity,
          tabSize: 2,
        }}
        onBeforeChange={(_editor, _data, value) => {
          setContent({ ...content, [activeTab]: value })
        }}
        onChange={() => {
          onChange(activeTab, content)
        }}
        defineMode={{ name: 'tailwindcss', fn: tailwindcssMode }}
      />
    </div>
  )
}
