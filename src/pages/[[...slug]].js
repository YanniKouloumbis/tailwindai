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
import Error from 'next/error'
import clsx from 'clsx'
import { ErrorOverlay } from '../components/ErrorOverlay'
import { toggleTheme } from '../utils/theme'
import Router from 'next/router'

const EditorDesktop = dynamic(import('../components/Editor'), { ssr: false })
const EditorMobile = dynamic(import('../components/EditorMobile'), {
  ssr: false,
})

const Editor = isMobile() ? EditorMobile : EditorDesktop

const HEADER_HEIGHT = 60 - 1
const TAB_BAR_HEIGHT = 40
const RESIZER_SIZE = 1
const DEFAULT_RESPONSIVE_SIZE = { width: 540, height: 720 }

function TabButton({ isActive, onClick, children }) {
  return (
    <button
      type="button"
      className={clsx(
        'flex text-xs leading-4 font-medium px-0.5 border-t-2 focus:outline-none transition-colors duration-150',
        {
          'border-turquoise-500 text-gray-900 dark:text-white': isActive,
          'border-transparent text-gray-500 hover:text-gray-900 focus:text-gray-900 dark:text-gray-400 dark:hover:text-white': !isActive,
        }
      )}
      onClick={onClick}
    >
      <span className="border-b-2 border-transparent py-2.5">{children}</span>
    </button>
  )
}

function Share({
  initialPath,
  editorRef,
  dirty,
  layout,
  responsiveSize,
  activeTab,
  onShareStart,
  onShareComplete,
}) {
  const [{ state, path }, setState] = useState({
    state: 'disabled',
    path: initialPath,
  })

  useEffect(() => {
    if (initialPath) {
      setState((current) =>
        current.state === 'idle' || current.state === 'disabled'
          ? { state: 'disabled', path: initialPath }
          : current
      )
    }
  }, [initialPath])

  useEffect(() => {
    let current = true
    if (state === 'loading') {
      if (onShareStart) onShareStart()
      window
        .fetch('/api/share', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            html: editorRef.current.getValue('html'),
            css: editorRef.current.getValue('css'),
            config: editorRef.current.getValue('config'),
          }),
        })
        .then((res) => res.json())
        .then((res) => {
          if (current) {
            const newPath = `/${res.ID}${getLayoutQueryString({
              layout,
              responsiveSize,
              file: activeTab,
            })}`
            if (onShareComplete) onShareComplete(newPath)
            navigator.clipboard
              .writeText(window.location.origin + newPath)
              .then(() => {
                if (current) {
                  setState({ state: 'copied', path: newPath })
                }
              })
              .catch(() => {
                if (current) {
                  setState({ state: 'disabled', path: newPath })
                }
              })
          }
        })
    } else if (state === 'copied') {
      window.setTimeout(() => {
        setState(({ state, path: currentPath }) =>
          state === 'copied' && currentPath === path
            ? { state: 'disabled', path: currentPath }
            : { state, path: currentPath }
        )
      }, 1500)
    }
    return () => {
      current = false
    }
  }, [state, path, editorRef, onShareStart, onShareComplete])

  useEffect(() => {
    if (dirty) {
      setState({ state: 'idle' })
    }
  }, [dirty])

  return (
    <div className="hidden sm:flex items-center space-x-4 min-w-0">
      <button
        type="button"
        className={clsx(
          'relative flex-none rounded-md border border-gray-200 text-sm font-medium leading-5 py-1.5 px-4 focus:border-turquoise-400 focus:outline-none focus:shadow-outline dark:bg-gray-800 dark:border-transparent dark:focus:bg-gray-700 dark:focus:border-turquoise-500',
          {
            'opacity-50': state === 'disabled',
            'cursor-auto':
              state === 'disabled' || state === 'copied' || state === 'loading',
            'hover:bg-gray-50 dark:hover:bg-gray-700':
              state !== 'disabled' && state !== 'copied' && state !== 'loading',
          }
        )}
        onClick={() => {
          setState({ state: 'loading' })
        }}
        disabled={
          state === 'copied' || state === 'disabled' || state === 'loading'
        }
      >
        <span
          className={clsx('absolute inset-0 flex items-center justify-center', {
            invisible: state === 'copied' || state === 'loading',
          })}
          aria-hidden={
            state === 'copied' || state === 'loading' ? 'true' : 'false'
          }
        >
          Share
        </span>
        <span
          className={clsx('absolute inset-0 flex items-center justify-center', {
            invisible: state !== 'loading',
          })}
          aria-hidden={state !== 'loading' ? 'true' : 'false'}
        >
          <span className="sr-only">Loading</span>
          <svg fill="none" viewBox="0 0 24 24" className="w-4 h-4 animate-spin">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </span>
        <span
          className={clsx('text-teal-600', { invisible: state !== 'copied' })}
          aria-hidden={state === 'copied' ? 'false' : 'true'}
        >
          Copied!
        </span>
      </button>
      {(state === 'copied' || state === 'disabled') && (
        <button
          type="button"
          className="group flex-auto min-w-0 flex items-center space-x-1.5 text-sm leading-5 font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          title={`https://play.tailwindcss.com${path}`}
          onClick={() => {
            navigator.clipboard
              .writeText(window.location.origin + path)
              .then(() => {
                setState((currentState) => ({
                  ...currentState,
                  state: 'copied',
                }))
              })
          }}
        >
          <span className="truncate">{path}</span>
          <svg
            width="20"
            height="20"
            className="flex-none fill-current opacity-0 group-hover:opacity-100 group-focus:opacity-100"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M10 4.5H6A1.5 1.5 0 004.5 6v4A1.5 1.5 0 006 11.5h1V10a3 3 0 013-3h1.5V6A1.5 1.5 0 0010 4.5zM13 7V6a3 3 0 00-3-3H6a3 3 0 00-3 3v4a3 3 0 003 3h1v1a3 3 0 003 3h4a3 3 0 003-3v-4a3 3 0 00-3-3h-1zm-3 1.5h4a1.5 1.5 0 011.5 1.5v4a1.5 1.5 0 01-1.5 1.5h-4A1.5 1.5 0 018.5 14v-4A1.5 1.5 0 0110 8.5z"
            />
          </svg>
        </button>
      )}
    </div>
  )
}

export default function App({ errorCode, ...props }) {
  if (errorCode) {
    return <Error statusCode={errorCode} />
  }
  return <Pen {...props} />
}

function HeaderButton({
  isActive = false,
  label,
  onClick,
  fillOnly = false,
  className,
  children,
}) {
  return (
    <button
      type="button"
      className={clsx(
        className,
        'group rounded-md border border-transparent focus:bg-gray-100 focus:outline-none dark:focus:bg-black dark:focus:border-gray-800',
        {
          'text-gray-700 dark:text-white': isActive,
          'text-gray-400': !isActive,
        }
      )}
      onClick={onClick}
    >
      <span className="sr-only">{label}</span>
      <svg
        width="34"
        height="34"
        viewBox="-5 -5 34 34"
        strokeWidth={fillOnly ? 0 : 1.5}
        className={clsx(
          fillOnly
            ? {
                'fill-gray-400 group-hover:fill-gray-500 group-focus:fill-gray-500 dark:fill-gray-500 dark:group-hover:fill-gray-400 dark:group-focus:fill-gray-400': !isActive,
                'fill-turquoise-500 group-hover:fill-turquoise-600 dark:fill-turquoise-400 dark:group-hover:fill-turquoise-300 dark:group-focus:fill-turquoise-300': isActive,
              }
            : {
                'fill-gray-300 stroke-gray-400 group-hover:fill-gray-400 group-hover:stroke-gray-500 group-focus:fill-gray-400 group-focus:stroke-gray-500 dark:fill-gray-700 dark:stroke-gray-500 dark:group-hover:fill-gray-600 dark:group-hover:stroke-gray-400 dark:group-focus:fill-gray-600 dark:group-focus:stroke-gray-400': !isActive,
                'fill-turquoise-100 stroke-turquoise-500 group-hover:fill-turquoise-200 group-hover:stroke-turquoise-600 dark:fill-turquoise-800 dark:stroke-turquoise-400 dark:group-hover:fill-turquoise-700 dark:group-hover:stroke-turquoise-300 dark:group-focus:fill-turquoise-700 dark:group-focus:stroke-turquoise-300': isActive,
              }
        )}
      >
        {children}
      </svg>
    </button>
  )
}

function Pen({
  initialContent,
  initialPath,
  initialLayout,
  initialResponsiveSize,
  initialActiveTab,
}) {
  const previewRef = useRef()
  const worker = useRef()
  const [size, setSize] = useState({ percentage: 0.5, layout: initialLayout })
  const [resizing, setResizing] = useState(false)
  const [activeTab, setActiveTab] = useState(initialActiveTab)
  const [activePane, setActivePane] = useState(
    initialLayout === 'preview' ? 'preview' : 'editor'
  )
  const isMd = useMedia('(min-width: 768px)')
  const [dirty, setDirty] = useState(false)
  const [renderEditor, setRenderEditor] = useState(false)
  const [
    error,
    setError,
    setErrorImmediate,
    cancelSetError,
  ] = useDebouncedState(undefined, 1000)
  const editorRef = useRef()
  const [responsiveDesignMode, setResponsiveDesignMode] = useState(
    initialResponsiveSize ? true : false
  )
  const [shouldClearOnUpdate, setShouldClearOnUpdate] = useState(true)
  const [isLoading, setIsLoading, setIsLoadingImmediate] = useDebouncedState(
    false,
    1000
  )
  const [responsiveSize, setResponsiveSize] = useState(
    initialResponsiveSize || DEFAULT_RESPONSIVE_SIZE
  )

  useEffect(() => {
    setDirty(false)
    if (
      shouldClearOnUpdate &&
      previewRef.current &&
      previewRef.current.contentWindow
    ) {
      previewRef.current.contentWindow.postMessage({
        clear: true,
      })
      inject({ html: initialContent.html })
      compileNow(initialContent)
    }
  }, [initialContent.ID])

  const inject = useCallback((content) => {
    previewRef.current.contentWindow.postMessage(content)
  }, [])

  async function compileNow(content) {
    let validateResult = await validateJavaScript(content.config)
    if (!validateResult.isValid) {
      return setError({ ...validateResult.error, file: 'Config' })
    }
    cancelSetError()
    setIsLoading(true)
    const { css, canceled, error } = await requestResponse(worker.current, {
      config: content.config,
      css: content.css,
    })
    if (canceled) {
      return
    }
    setIsLoadingImmediate(false)
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
      setDirty((dirty) => (dirty === false ? true : dirty))
      if (document === 'html') {
        inject({ html: content.html })
      } else {
        compile({ css: content.css, config: content.config })
      }
    },
    [inject, compile]
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
          const min = size.layout === 'vertical' ? 320 : 320 + TAB_BAR_HEIGHT
          const max =
            size.layout === 'vertical'
              ? windowSize - min - RESIZER_SIZE
              : windowSize - 320 - RESIZER_SIZE

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
          (isMd && size.layout !== 'preview') ||
          (!isMd && activePane === 'editor')
            ? windowSize
            : 0

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
      if (size.layout !== 'preview') {
        setRenderEditor(true)
      }
    } else if (activePane === 'editor') {
      setRenderEditor(true)
    }
  }, [activePane, isMd, size.layout])

  useEffect(() => {
    if (resizing) {
      document.body.classList.add(
        size.layout === 'vertical' ? 'cursor-ew-resize' : 'cursor-ns-resize'
      )
    } else {
      document.body.classList.remove(
        size.layout === 'vertical' ? 'cursor-ew-resize' : 'cursor-ns-resize'
      )
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

  const onShareStart = useCallback(() => {
    setDirty(false)
  }, [])

  const onShareComplete = useCallback(
    (path) => {
      setShouldClearOnUpdate(false)
      Router.push(path).then(() => {
        setShouldClearOnUpdate(true)
      })
    },
    [size.layout, responsiveDesignMode, responsiveSize]
  )

  // initial state resets
  useEffect(() => {
    setSize((size) => ({ ...size, layout: initialLayout }))
  }, [initialLayout])
  useEffect(() => {
    setResponsiveDesignMode(Boolean(initialResponsiveSize))
    setResponsiveSize(initialResponsiveSize || DEFAULT_RESPONSIVE_SIZE)
  }, [initialResponsiveSize])
  useEffect(() => {
    setActiveTab(initialActiveTab)
  }, [initialActiveTab])

  const isDefaultContent =
    initialContent.html === defaultContent.html &&
    initialContent.css === defaultContent.css &&
    initialContent.config === defaultContent.config

  return (
    <>
      <header className="relative z-10 flex-none py-3 px-5 sm:px-6 flex items-center space-x-4">
        <div className="flex-auto flex items-center min-w-0 space-x-5">
          <Logo className="flex-none" />
          <Share
            editorRef={editorRef}
            onShareStart={onShareStart}
            onShareComplete={onShareComplete}
            dirty={dirty}
            initialPath={initialPath}
            layout={size.layout}
            responsiveSize={responsiveDesignMode ? responsiveSize : undefined}
            activeTab={activeTab}
          />
        </div>
        <div className="flex items-center space-x-5">
          <div className="hidden md:flex items-center space-x-3.5">
            <HeaderButton
              isActive={size.layout === 'vertical'}
              label="Switch to vertical split layout"
              onClick={() =>
                setSize((size) => ({ ...size, layout: 'vertical' }))
              }
            >
              <rect
                x="2.75"
                y="4.75"
                width="18.5"
                height="14.5"
                rx="1.25"
                fill="none"
              />
              <path d="M2.75 6c0-.69.56-1.25 1.25-1.25h7.25v14.5H4c-.69 0-1.25-.56-1.25-1.25V6z" />
            </HeaderButton>
            <HeaderButton
              isActive={size.layout === 'horizontal'}
              label="Switch to horizontal split layout"
              onClick={() =>
                setSize((size) => ({ ...size, layout: 'horizontal' }))
              }
            >
              <rect
                x="2.75"
                y="4.75"
                width="18.5"
                height="14.5"
                rx="1.25"
                fill="none"
              />
              <path d="M2.75 12.75h18.5V18c0 .69-.56 1.25-1.25 1.25H4c-.69 0-1.25-.56-1.25-1.25v-5.25z" />
            </HeaderButton>
            <HeaderButton
              isActive={size.layout === 'preview'}
              label="Switch to preview-only layout"
              onClick={() =>
                setSize((size) => ({ ...size, layout: 'preview' }))
              }
            >
              <rect
                x="2.75"
                y="4.75"
                width="18.5"
                height="14.5"
                rx="1.25"
                fill="none"
              />
            </HeaderButton>
          </div>
          <div className="hidden md:block w-px h-8 bg-gray-200 dark:bg-gray-700" />
          <HeaderButton
            isActive={responsiveDesignMode}
            label="Toggle responsive design mode"
            onClick={() => setResponsiveDesignMode(!responsiveDesignMode)}
            fillOnly={true}
            className="hidden md:block"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M6 8H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v4zm14-4.5H8a.5.5 0 00-.5.5v4H10a2 2 0 012 2v10c0 .173-.022.34-.063.5H20a.5.5 0 00.5-.5V4a.5.5 0 00-.5-.5zm-10 17a.5.5 0 00.5-.5V10a.5.5 0 00-.5-.5H4a.5.5 0 00-.5.5v10a.5.5 0 00.5.5h6z"
            />
          </HeaderButton>
          <div className="hidden md:block w-px h-8 bg-gray-200 dark:bg-gray-700" />
          <HeaderButton
            label={
              <>
                <span className="dark:hidden">Switch to dark theme</span>
                <span className="hidden dark:inline">
                  Switch to light theme
                </span>
              </>
            }
            onClick={toggleTheme}
            fillOnly={true}
          >
            <g className="dark:opacity-0">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M9.353 2.939a1 1 0 01.22 1.08 8 8 0 0010.408 10.408 1 1 0 011.301 1.3A10.003 10.003 0 0112 22C6.477 22 2 17.523 2 12c0-4.207 2.598-7.805 6.273-9.282a1 1 0 011.08.22z"
              />
            </g>
            <g className="opacity-0 dark:opacity-100">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zM4.929 4.929a1 1 0 011.414 0l.707.707A1 1 0 115.636 7.05l-.707-.707a1 1 0 010-1.414zm14.142 0a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM7 12a5 5 0 1110 0 5 5 0 01-10 0zm-5 0a1 1 0 011-1h1a1 1 0 110 2H3a1 1 0 01-1-1zm17 0a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1zm-2.05 4.95a1 1 0 011.414 0l.707.707a1 1 0 01-1.414 1.414l-.707-.707a1 1 0 010-1.414zm-11.314 0a1 1 0 011.414 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707zM12 19a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1z"
              />
            </g>
          </HeaderButton>
        </div>
      </header>
      <main className="flex-auto relative border-t border-gray-200 dark:border-gray-800">
        {initialContent && typeof size.current !== 'undefined' ? (
          <>
            {(!isMd || size.layout !== 'preview') && (
              <div
                className="flex items-center flex-none pl-5 pr-4 sm:pl-6 absolute z-10 top-0 left-0 -mt-px"
                style={{
                  width: size.layout === 'vertical' ? size.current : '100%',
                }}
              >
                <div className="flex space-x-5">
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
                      (isMd || activePane === 'editor') &&
                      activeTab === 'config'
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
                {isLoading && (
                  <p className="ml-auto">
                    <span className="sr-only">Loading</span>
                    <svg
                      fill="none"
                      viewBox="0 0 24 24"
                      className="w-4 h-4 animate-spin"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  </p>
                )}
              </div>
            )}
            <SplitPane
              split={size.layout === 'horizontal' ? 'horizontal' : 'vertical'}
              minSize={size.min}
              maxSize={size.max}
              size={size.current}
              onChange={updateCurrentSize}
              paneStyle={{ marginTop: -1 }}
              pane1Style={{ display: 'flex', flexDirection: 'column' }}
              onDragStarted={() => setResizing(true)}
              onDragFinished={() => setResizing(false)}
              allowResize={isMd && size.layout !== 'preview'}
              resizerClassName={
                isMd && size.layout !== 'preview'
                  ? 'Resizer'
                  : 'Resizer-collapsed'
              }
            >
              <div className="border-t border-gray-200 dark:border-gray-800 mt-10 flex-auto flex">
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
                  responsiveSize={responsiveSize}
                  onChangeResponsiveSize={setResponsiveSize}
                  iframeClassName={resizing ? 'pointer-events-none' : ''}
                  className={
                    'mt-10 border-t border-gray-200 dark:border-gray-600 md:mt-0 md:border-0'
                  }
                  onLoad={() => {
                    inject({
                      html: initialContent.html,
                      ...(isDefaultContent
                        ? { css: defaultContent.compiledCss }
                        : {}),
                    })
                    compileNow(initialContent)
                  }}
                />
                <ErrorOverlay error={error} />
              </div>
            </SplitPane>
          </>
        ) : null}
      </main>
    </>
  )
}

export async function getServerSideProps({ params, res, query }) {
  const layoutProps = {
    initialLayout: ['vertical', 'horizontal', 'preview'].includes(query.layout)
      ? query.layout
      : 'vertical',
    initialResponsiveSize: sizeToObject(query.size),
    initialActiveTab: ['html', 'css', 'config'].includes(query.file)
      ? query.file
      : 'html',
  }

  if (!params.slug) {
    res.setHeader(
      'cache-control',
      'public, max-age=0, must-revalidate, s-maxage=31536000'
    )
    return {
      props: {
        initialContent: defaultContent,
        ...layoutProps,
      },
    }
  }

  if (params.slug.length > 1) {
    return {
      props: {
        errorCode: 404,
      },
    }
  }

  if (params.slug.length === 1) {
    const AWS = require('aws-sdk')

    const db = new AWS.DynamoDB.DocumentClient({
      credentials: {
        accessKeyId: process.env.TW_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.TW_AWS_SECRET_ACCESS_KEY,
      },
      region: process.env.TW_AWS_DEFAULT_REGION,
    })

    function get(ID) {
      return new Promise((resolve, reject) => {
        const start = +new Date()
        db.get(
          { TableName: process.env.TW_TABLE_NAME, Key: { ID } },
          (err, data) => {
            if (err) reject(err)
            console.log((+new Date() - start) / 1000)
            resolve(data)
          }
        )
      })
    }

    try {
      const { Item: initialContent } = await get(params.slug[0])

      if (initialContent) {
        res.setHeader(
          'cache-control',
          'public, max-age=0, must-revalidate, s-maxage=31536000'
        )
      }

      return {
        props: initialContent
          ? {
              initialContent,
              initialPath: `/${initialContent.ID}${getLayoutQueryString({
                layout: query.layout,
                responsiveSize: query.size,
                file: query.file,
              })}`,
              ...layoutProps,
            }
          : {
              errorCode: 404,
            },
      }
    } catch (error) {
      console.error(error)
      return {
        props: {
          errorCode: 500,
        },
      }
    }
  }
}

function sizeToString(size) {
  const obj = sizeToObject(size)
  return obj ? `${obj.width}x${obj.height}` : null
}

function sizeToObject(size) {
  if (!size) return null

  if (typeof size === 'string') {
    const match = size.match(/^([0-9]+)x([0-9]+)$/)
    if (match === null) return false
    const width = parseInt(match[1], 10)
    const height = parseInt(match[2], 10)
    return width >= 50 && height >= 50 ? { width, height } : null
  }

  return size.width >= 50 && size.height >= 50 ? size : null
}

function getLayoutQueryString({ layout, responsiveSize, file }) {
  const params = {
    layout: ['vertical', 'horizontal', 'preview'].includes(layout)
      ? layout
      : undefined,
    size: sizeToString(responsiveSize),
    file: ['html', 'css', 'config'].includes(file) ? file : undefined,
  }
  return Object.keys(params)
    .filter((key) => params[key])
    .reduce((acc, key, i) => {
      if (i === 0) return `?${key}=${params[key]}`
      return `${acc}&${key}=${params[key]}`
    }, '')
}
