import { useState, useRef, useEffect, useCallback } from 'react'
import Worker from 'worker-loader?filename=static/[name].[hash].js!../workers/postcss.worker.js'
import CompressWorker from 'worker-loader?filename=static/[name].[hash].js!../workers/compress.worker.js'
import dynamic from 'next/dynamic'
import LZString from 'lz-string'
import { createWorkerQueue } from '../utils/createWorkerQueue'
import { debounce } from 'debounce'
import SplitPane from 'react-split-pane'
import { Logo } from '../components/Logo'

const Editor = dynamic(import('../components/Editor'), { ssr: false })

const defaultContent = {
  html: `<div class="md:flex">
  <div class="md:flex-shrink-0">
    <img class="rounded-lg md:w-56" src="https://images.unsplash.com/photo-1556740738-b6a63e27c4df?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=448&q=80" alt="Woman paying for a purchase">
  </div>
  <div class="mt-4 md:mt-0 md:ml-6">
    <div class="uppercase tracking-wide text-sm text-indigo-600 font-bold">Marketing</div>
    <a href="#" class="block mt-1 text-lg leading-tight font-semibold text-gray-900 hover:underline">Finding customers for your new business</a>
    <p class="mt-2 text-gray-600">Getting a new business off the ground is a lot of hard work. Here are five ideas you can use to find your first customers.</p>
  </div>
</div>\n`,
  css: '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n',
  config: 'module.exports = {\n  theme: {\n    //\n  }\n}\n',
}

export default function App() {
  const previewRef = useRef()
  const worker = useRef()
  const compressWorker = useRef()
  const [initialContent, setInitialContent] = useState()
  const [size, setSize] = useState()
  const [resizing, setResizing] = useState(false)
  const [activeTab, setActiveTab] = useState('html')

  const injectHtml = useCallback((html) => {
    previewRef.current.contentWindow.postMessage({
      html,
    })
  }, [])

  const compileNow = useCallback(async (content) => {
    const { css, canceled, error } = await worker.current.emit({
      config: content.config,
      css: content.css,
    })
    if (canceled || error) {
      return
    }
    if (css) {
      previewRef.current.contentWindow.postMessage({ css })
    }
  }, [])

  const compile = useCallback(debounce(compileNow, 200), [])

  const updateUrl = useCallback(async (content) => {
    let { compressed, canceled, error } = await compressWorker.current.emit({
      string: JSON.stringify(content),
    })
    if (canceled || error) {
      return
    }
    if (compressed) {
      window.history.replaceState({}, '', `#${compressed}`)
    }
  }, [])

  const onChange = useCallback(
    (document, content) => {
      if (document === 'html') {
        injectHtml(content.html)
      } else {
        compile({ css: content.css, config: content.config })
      }
      updateUrl(content)
    },
    [injectHtml, compile, updateUrl]
  )

  useEffect(() => {
    worker.current = createWorkerQueue(Worker)
    compressWorker.current = createWorkerQueue(CompressWorker)

    const content = defaultContent

    if (window.location.hash) {
      try {
        Object.assign(
          content,
          JSON.parse(
            LZString.decompressFromEncodedURIComponent(
              window.location.hash.substr(1)
            )
          )
        )
      } catch (_) {}
    }

    setInitialContent({
      html: content.html,
      css: content.css,
      config: content.config,
    })

    const windowWidth = window.innerWidth
    setSize({
      current: windowWidth / 2,
      min: 320,
      max: windowWidth - 320,
    })

    return () => {
      worker.current.terminate()
      compressWorker.current.terminate()
    }
  }, [compileNow, injectHtml])

  useEffect(() => {
    function onResize() {
      const max = window.innerWidth - 320
      setSize((size) => ({
        ...size,
        max,
        current: Math.max(Math.min(size.current, max), 320),
      }))
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
    }
  }, [])

  useEffect(() => {
    if (resizing) {
      document.body.classList.add('cursor-col-resize')
    } else {
      document.body.classList.remove('cursor-col-resize')
    }
  }, [resizing])

  const updateCurrentSize = useCallback((newSize) => {
    setSize((size) => ({ ...size, current: newSize }))
  }, [])

  return (
    <>
      <header className="relative z-10 flex-none py-5 px-8 shadow">
        <Logo />
      </header>
      <main className="flex-auto relative">
        {initialContent && size ? (
          <SplitPane
            split="vertical"
            minSize={size.min}
            maxSize={size.max}
            size={size.current}
            onChange={updateCurrentSize}
            pane1Style={{ display: 'flex', flexDirection: 'column' }}
            onDragStarted={() => setResizing(true)}
            onDragFinished={() => setResizing(false)}
          >
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
              <Editor
                initialContent={initialContent}
                onChange={onChange}
                worker={worker}
                activeTab={activeTab}
              />
            </>
            <iframe
              ref={previewRef}
              title="Preview"
              className={`absolute inset-0 w-full h-full ${
                resizing ? 'pointer-events-none' : ''
              }`}
              onLoad={() => {
                injectHtml(initialContent.html)
                compileNow(initialContent)
              }}
              srcDoc={`<!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style id="_style"></style>
              <script>
              window.addEventListener('message', (e) => {
                if ('css' in e.data) {
                  const style = document.getElementById('_style')
                  const newStyle = document.createElement('style')
                  newStyle.id = '_style'
                  newStyle.innerHTML = e.data.css
                  style.parentNode.replaceChild(newStyle, style)
                }
                if ('html' in e.data) {
                  document.body.innerHTML = e.data.html
                }
              })
              </script>
            </head>
            <body>
            </body>
          </html>`}
            />
          </SplitPane>
        ) : null}
      </main>
    </>
  )
}
