import { useState, useRef, useEffect } from 'react'
import Worker from 'worker-loader?filename=static/[name].[hash].js!../workers/postcss.worker.js'
import CompressWorker from 'worker-loader?filename=static/[name].[hash].js!../workers/compress.worker.js'
import dynamic from 'next/dynamic'
import LZString from 'lz-string'
import { createWorkerQueue } from '../utils/createWorkerQueue'

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
  config:
    "/** @type {import('tailwindcss').Config} */\nmodule.exports = {\n  theme: {\n    //\n  }\n}\n",
}

export default function App() {
  const previewRef = useRef()
  const worker = useRef()
  const compressWorker = useRef()
  const [content, setContent] = useState()
  const [debouncedContent, setDebouncedContent] = useState()
  const initialUpdate = useRef(true)

  useEffect(() => {
    worker.current = createWorkerQueue(Worker)
    compressWorker.current = createWorkerQueue(CompressWorker)

    if (window.location.hash) {
      try {
        const {
          html = defaultContent.html,
          css = defaultContent.css,
          config = defaultContent.config,
        } = JSON.parse(
          LZString.decompressFromEncodedURIComponent(
            window.location.hash.substr(1)
          )
        )
        setContent({ html, css, config })
      } catch (_) {
        setContent(defaultContent)
      }
    } else {
      setContent(defaultContent)
    }

    return () => {
      worker.current.terminate()
      compressWorker.current.terminate()
    }
  }, [])

  useEffect(() => {
    if (
      typeof debouncedContent?.css === 'undefined' ||
      typeof debouncedContent?.config === 'undefined'
    ) {
      return
    }
    let current = true
    worker.current
      .emit({
        config: debouncedContent.config,
        css: debouncedContent.css,
      })
      .then(({ css, canceled, error }) => {
        if (!current || canceled || error) {
          return
        }
        if (css) {
          previewRef.current.contentWindow.postMessage({ css })
        }
      })
    return () => (current = false)
  }, [debouncedContent?.css, debouncedContent?.config])

  useEffect(() => {
    if (
      typeof debouncedContent?.html === 'undefined' ||
      typeof debouncedContent?.css === 'undefined' ||
      typeof debouncedContent?.config === 'undefined'
    ) {
      return
    }
    let current = true
    compressWorker.current
      .emit({
        string: JSON.stringify(debouncedContent),
      })
      .then(({ compressed, canceled, error }) => {
        if (!current || canceled || error) {
          return
        }
        if (compressed) {
          window.history.replaceState({}, '', `#${compressed}`)
        }
      })
    return () => (current = false)
  }, [debouncedContent?.html, debouncedContent?.css, debouncedContent?.config])

  useEffect(() => {
    if (typeof content?.html === 'undefined') return
    previewRef.current.contentWindow.postMessage({
      html: content.html,
    })
  }, [content?.html])

  useEffect(() => {
    if (!content) return
    if (initialUpdate.current) {
      setDebouncedContent(content)
      initialUpdate.current = false
      return
    }
    const handler = window.setTimeout(() => {
      setDebouncedContent(content)
    }, 200)
    return () => {
      window.clearTimeout(handler)
    }
  }, [content?.html, content?.css, content?.config])

  return (
    <>
      <div className="relative flex h-full">
        <div className="w-1/2 flex-none flex">
          <div className="flex flex-col w-full">
            {content && <Editor onChange={setContent} content={content} />}
          </div>
        </div>
        <div className="relative w-1/2 flex-none">
          <iframe
            ref={previewRef}
            className="absolute inset-0 w-full h-full"
            srcDoc={`<!DOCTYPE html>
            <html lang="en">
              <head>
                <style></style>
                <script>
                const style = document.querySelector('style')
                window.addEventListener('message', (e) => {
                  if ('css' in e.data) {
                    style.innerHTML = e.data.css
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
        </div>
      </div>
    </>
  )
}
