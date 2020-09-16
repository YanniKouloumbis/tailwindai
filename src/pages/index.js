import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
} from 'react'
import Worker from 'worker-loader?publicPath=/_next/&filename=static/[name].[hash].js&chunkFilename=static/chunks/[id].[contenthash].worker.js!../workers/postcss.worker.js'
import dynamic from 'next/dynamic'
import { requestResponse } from '../utils/workers'
import { debounce } from 'debounce'
import SplitPane from 'react-split-pane'
import { Logo } from '../components/Logo'
import useMedia from 'react-use/lib/useMedia'
import defaultContent from '../preval/defaultContent'
import { validateJavaScript } from '../utils/validateJavaScript'
import { useDebouncedState } from '../hooks/useDebouncedState'
import { Preview } from '../components/Preview'
import isMobile from 'is-mobile'

const EditorDesktop = dynamic(import('../components/Editor'), { ssr: false })
const EditorMobile = dynamic(import('../components/EditorMobile'), {
  ssr: false,
})

const Editor = isMobile() ? EditorMobile : EditorDesktop

const HEADER_HEIGHT = 65

function TabButton({ isActive, onClick, children }) {
  return (
    <button
      type="button"
      className={`rounded-md text-sm leading-6 font-medium px-2 focus:outline-none transition-colors duration-150 ${
        isActive
          ? 'text-black bg-gray-100 focus:bg-gray-200 dark:text-white dark:bg-gray-900'
          : 'text-gray-500 hover:text-black focus:text-black dark:text-gray-400 dark:hover:text-white'
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function Share({ editorRef }) {
  const [{ state, ID }, setState] = useState({ state: 'idle' })

  useEffect(() => {
    let current = true
    if (state === 'loading') {
      window
        .fetch('/api/share', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            html: editorRef.current.documents.html.model.getValue(),
            css: editorRef.current.documents.css.model.getValue(),
            config: editorRef.current.documents.config.model.getValue(),
          }),
        })
        .then((res) => res.json())
        .then((res) => {
          if (current) {
            setState({ state: 'complete', ID: res.ID })
          }
        })
    }
    return () => {
      current = false
    }
  }, [state, editorRef])

  return (
    <div className="flex space-x-5">
      {state !== 'loading' && (
        <button
          type="button"
          onClick={() => {
            setState({ state: 'loading' })
          }}
        >
          Share
        </button>
      )}
      {state === 'loading' && <p>Loading...</p>}
      {state === 'complete' && (
        <button
          type="button"
          className="underline"
          onClick={() => {
            navigator.clipboard
              .writeText(window.location.origin + '/' + ID)
              .then(() => {
                window.alert('Copied!')
              })
          }}
        >
          {ID}
        </button>
      )}
    </div>
  )
}

export default function App({ initialContent = defaultContent }) {
  const previewRef = useRef()
  const worker = useRef()
  const [size, setSize] = useState({ percentage: 0.5, layout: 'vertical' })
  const [resizing, setResizing] = useState(false)
  const [activeTab, setActiveTab] = useState('html')
  const [activePane, setActivePane] = useState('editor')
  const isMd = useMedia('(min-width: 768px)')
  const [renderEditor, setRenderEditor] = useState(false)
  const [
    error,
    setError,
    setErrorImmediate,
    cancelSetError,
  ] = useDebouncedState(undefined, 1000)
  const editorRef = useRef()
  const [responsiveDesignMode, setResponsiveDesignMode] = useState(false)

  const injectHtml = useCallback((html) => {
    previewRef.current.contentWindow.postMessage({
      html,
    })
  }, [])

  async function compileNow(content) {
    let validateResult = await validateJavaScript(content.config)
    if (!validateResult.isValid) {
      return setError({ ...validateResult.error, file: 'Config' })
    }
    cancelSetError()
    const { css, canceled, error } = await requestResponse(worker.current, {
      config: content.config,
      css: content.css,
    })
    if (canceled) {
      return
    }
    if (error) {
      setError(error)
      return
    }
    setErrorImmediate()
    if (css) {
      previewRef.current.contentWindow.postMessage({ css })
    }
  }

  const compile = useCallback(debounce(compileNow, 200), [])

  const onChange = useCallback(
    (document, content) => {
      if (document === 'html') {
        injectHtml(content.html)
      } else {
        compile({ css: content.css, config: content.config })
      }
    },
    [injectHtml, compile]
  )

  useEffect(() => {
    worker.current = new Worker()
    return () => {
      worker.current.terminate()
    }
  }, [])

  useLayoutEffect(() => {
    function updateSize() {
      setSize((size) => {
        const windowSize =
          size.layout === 'horizontal'
            ? window.innerHeight - HEADER_HEIGHT
            : window.innerWidth

        if (isMd && size.layout !== 'preview') {
          const min = 321
          const max = windowSize - min

          return {
            ...size,
            min,
            max,
            current: Math.max(
              Math.min(Math.round(windowSize * size.percentage), max),
              min
            ),
          }
        }

        const newSize =
          activePane === 'editor' && size.layout !== 'preview' ? windowSize : 0

        return {
          ...size,
          current: newSize,
          min: newSize,
          max: newSize,
        }
      })
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => {
      window.removeEventListener('resize', updateSize)
    }
  }, [isMd, setSize, size.layout, activePane])

  useEffect(() => {
    if (isMd) {
      setRenderEditor(true)
    } else if (activePane === 'editor') {
      setRenderEditor(true)
    } else {
      previewRef.current.focus()
    }
  }, [activePane, isMd])

  useEffect(() => {
    if (resizing) {
      document.body.classList.add('cursor-col-resize')
    } else {
      document.body.classList.remove('cursor-col-resize')
    }
  }, [resizing])

  const updateCurrentSize = useCallback((newSize) => {
    setSize((size) => {
      const windowSize =
        size.layout === 'vertical'
          ? window.innerWidth
          : window.innerHeight - HEADER_HEIGHT
      const percentage = newSize / windowSize
      return {
        ...size,
        current: newSize,
        percentage:
          percentage === 1 || percentage === 0 ? size.percentage : percentage,
      }
    })
  }, [])

  function toggleTheme() {
    const $html = document.querySelector('html')
    $html.classList.add('disable-transitions')
    if ($html.classList.contains('dark')) {
      $html.classList.remove('dark')
      try {
        window.localStorage.setItem('theme', 'light')
      } catch (_) {}
    } else {
      $html.classList.add('dark')
      try {
        window.localStorage.setItem('theme', 'dark')
      } catch (_) {}
    }
    window.setTimeout(() => {
      $html.classList.remove('disable-transitions')
    }, 0)
  }

  const isDefaultContent =
    initialContent.html === defaultContent.html &&
    initialContent.css === defaultContent.css &&
    initialContent.config === defaultContent.config

  return (
    <>
      <header className="relative z-10 flex-none py-5 px-5 sm:px-8 shadow dark:shadow-white flex md:grid grid-cols-3-balanced items-center">
        <div className="flex items-center space-x-5">
          <Logo />
          <Share editorRef={editorRef} />
        </div>
        <div className="hidden md:flex space-x-5">
          <button
            type="button"
            className={
              size.layout === 'vertical'
                ? 'text-gray-700 dark:text-white'
                : 'text-gray-400'
            }
            onClick={() => setSize((size) => ({ ...size, layout: 'vertical' }))}
          >
            <span className="sr-only">Switch to vertical split layout</span>
            <svg
              width={24}
              height={24}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <rect x={2.75} y={4.75} width={18.5} height={14.5} rx={1.25} />
              <path
                d="M2.75 6C2.75 5.30964 3.30964 4.75 4 4.75H11.25V19.25H4C3.30964 19.25 2.75 18.6904 2.75 18V6Z"
                fill="currentColor"
              />
            </svg>
          </button>
          <button
            type="button"
            className={
              size.layout === 'horizontal'
                ? 'text-gray-700 dark:text-white'
                : 'text-gray-400'
            }
            onClick={() =>
              setSize((size) => ({ ...size, layout: 'horizontal' }))
            }
          >
            <span className="sr-only">Switch to horizontal split layout</span>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect
                x="21.25"
                y="19.25"
                width="18.5"
                height="14.5"
                rx="1.25"
                transform="rotate(-180 21.25 19.25)"
              />
              <path
                d="M21.25 11.25L2.75 11.25L2.75 6C2.75 5.30964 3.30964 4.75 4 4.75L20 4.75C20.6904 4.75 21.25 5.30964 21.25 6L21.25 11.25Z"
                fill="currentColor"
              />
            </svg>
          </button>
          <button
            type="button"
            className={
              size.layout === 'preview'
                ? 'text-gray-700 dark:text-white'
                : 'text-gray-400'
            }
            onClick={() => setSize((size) => ({ ...size, layout: 'preview' }))}
          >
            <span className="sr-only">Switch to preview-only layout</span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect
                x="2.75"
                y="4.75"
                width="18.5"
                height="14.5"
                rx="1.25"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </button>
          <div className="w-px h-8 bg-gray-200 dark:bg-gray-600" />
          <button
            type="button"
            className={
              responsiveDesignMode
                ? 'text-gray-700 dark:text-white'
                : 'text-gray-400'
            }
            onClick={() => setResponsiveDesignMode(!responsiveDesignMode)}
          >
            <span className="sr-only">Toggle responsive design mode</span>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="6.75" y="2.75" width="14.5" height="18.5" rx="1.25" />
              <rect
                x="2.75"
                y="8.75"
                width="8.5"
                height="12.5"
                rx="1.25"
                className="fill-white dark:fill-gray-800"
              />
            </svg>
          </button>
        </div>
        <div className="flex justify-end ml-auto">
          <button type="button" className="text-gray-400" onClick={toggleTheme}>
            <span className="sr-only">Toggle theme</span>
            <svg
              className="w-5 h-5 block dark:hidden"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                clipRule="evenodd"
              />
            </svg>
            <svg
              className="w-5 h-5 hidden dark:block"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          </button>
        </div>
      </header>
      <main className="flex-auto relative">
        {initialContent && typeof size.current !== 'undefined' ? (
          <>
            {(!isMd || size.layout !== 'preview') && (
              <div className="flex flex-none px-5 sm:px-8 py-2 space-x-3 absolute z-10 top-0 left-0">
                <TabButton
                  isActive={
                    (isMd || activePane === 'editor') && activeTab === 'html'
                  }
                  onClick={() => {
                    setActivePane('editor')
                    setActiveTab('html')
                  }}
                >
                  HTML
                </TabButton>
                <TabButton
                  isActive={
                    (isMd || activePane === 'editor') && activeTab === 'css'
                  }
                  onClick={() => {
                    setActivePane('editor')
                    setActiveTab('css')
                  }}
                >
                  CSS
                </TabButton>
                <TabButton
                  isActive={
                    (isMd || activePane === 'editor') && activeTab === 'config'
                  }
                  onClick={() => {
                    setActivePane('editor')
                    setActiveTab('config')
                  }}
                >
                  Config
                </TabButton>
                {!isMd && (
                  <TabButton
                    isActive={activePane === 'preview'}
                    onClick={() => {
                      setActivePane('preview')
                    }}
                  >
                    Preview
                  </TabButton>
                )}
              </div>
            )}
            <SplitPane
              split={size.layout === 'horizontal' ? 'horizontal' : 'vertical'}
              minSize={size.min}
              maxSize={size.max}
              size={size.current}
              onChange={updateCurrentSize}
              paneStyle={{ overflow: 'hidden' }}
              pane1Style={{ display: 'flex', flexDirection: 'column' }}
              onDragStarted={() => setResizing(true)}
              onDragFinished={() => setResizing(false)}
              allowResize={isMd && size.layout !== 'preview'}
            >
              <div className="border-t border-gray-200 dark:border-gray-600 mt-10 flex-auto flex">
                {renderEditor && (
                  <Editor
                    editorRef={(ref) => (editorRef.current = ref)}
                    initialContent={initialContent}
                    onChange={onChange}
                    worker={worker}
                    activeTab={activeTab}
                  />
                )}
              </div>
              <div className="absolute inset-0 w-full h-full">
                <Preview
                  ref={previewRef}
                  responsiveDesignMode={isMd && responsiveDesignMode}
                  iframeClassName={resizing ? 'pointer-events-none' : ''}
                  className={
                    isMd
                      ? ''
                      : 'mt-10 border-t border-gray-200 dark:border-gray-600'
                  }
                  onLoad={() => {
                    injectHtml(initialContent.html)
                    compileNow(initialContent)
                  }}
                  initialCss={
                    isDefaultContent ? defaultContent.compiledCss : ''
                  }
                />
                {error && (
                  <div className="absolute inset-0 w-full h-full bg-red-500 text-white p-8 text-lg">
                    <p>
                      {error.file} error: {error.message}
                    </p>
                    {typeof error.line !== 'undefined' ? (
                      <p>Line: {error.line}</p>
                    ) : null}
                  </div>
                )}
              </div>
            </SplitPane>
          </>
        ) : null}
      </main>
    </>
  )
}
