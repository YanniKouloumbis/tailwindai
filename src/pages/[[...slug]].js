import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
} from 'react'
import Worker from 'worker-loader?publicPath=/_next/&filename=static/chunks/[name].[hash].js&chunkFilename=static/chunks/[id].[contenthash].worker.js!../workers/postcss.worker.js'
import { requestResponse } from '../utils/workers'
import { debounce } from 'debounce'
import { Editor } from '../components/Editor'
import SplitPane from 'react-split-pane'
import useMedia from 'react-use/lib/useMedia'
import defaultContent from '../preval/defaultContent'
import { validateJavaScript } from '../utils/validateJavaScript'
import { useDebouncedState } from '../hooks/useDebouncedState'
import { Preview } from '../components/Preview'
import Error from 'next/error'
import { ErrorOverlay } from '../components/ErrorOverlay'
import Router from 'next/router'
import { Header } from '../components/Header'
// import { Share } from '../components/Share'
import { TabBar } from '../components/TabBar'
import { sizeToObject } from '../utils/size'
import { getLayoutQueryString } from '../utils/getLayoutQueryString'
import { get } from '../utils/database'
import toast, { Toaster } from 'react-hot-toast'
// import { WhopSDK } from "@whop-sdk/core";
// import { unstable_getServerSession } from "next-auth";
// import { authOptions } from "../auth";

// /**
//  * gets the UserService from the WhopSDK from the session
//  * @in getServerSideProps and api routes
//  */
// const getSdk = async (
//   req,
//   res
// ) => {
//   const session = await unstable_getServerSession(req, res, authOptions);
//   if (!session) return {};
//   return {
//     sdk: new WhopSDK({ TOKEN: session.accessToken }).userOAuth,
//     user: session.user,
//   };
// };


const HEADER_HEIGHT = 60 - 1
const TAB_BAR_HEIGHT = 40
const RESIZER_SIZE = 1
const DEFAULT_RESPONSIVE_SIZE = { width: 540, height: 720 }

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
  const [prompt, setPrompt] = useState('');
  const [generatedCode, setGeneratedCode] = useState(initialContent);
  const [generationLoading, setGenerationLoading] = useState(false);
  const handleGenerateCode = async () => {
    // if(!user){
    //   toast.error("You must be logged in to generate code.")
    //   return
    // }
    // code generation logic here, for example:
    if(!window.ai){
      toast.custom(
        <div className="bg-indigo-800 p-5 rounded-lg shadow-lg flex flex-col items-center space-y-4 transition-all duration-300 ease-in-out hover:shadow-xl">
          <p className="text-lg font-semibold text-indigo-200"> Window.ai was not detected! Please install the window.ai extension.
          </p>
          <a
            href="https://windowai.io"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-indigo-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-indigo-400 transition-colors duration-300 ease-in-out"
          >
            Visit windowai.io
          </a>
        </div>,
        {
          id: 'window-ai-not-detected',
          duration: 3000,
        },
      );
      return;
    }
    try{
      setGenerationLoading(true)
      const [ response ]  = await window.ai.generateText(
        { messages: [
          {role: "system", content: "RESPOND ONLY IN TAILWINDUICSS HTML! USE EMOJIS IF POSSIBLE INSTEAD OF WRITING OUT WHOLE SVGS. DO NOT ADD COMMENTARY. DO NOT RESPOND IN MARKDOWN. YOUR OUTPUT WILL BE INPUT FOR A TAILWINDUICSS HTML FILE."},
          {role: "user", content: `based on the below design specification, output the tailwinduicss html code that corresponds to the design specification. you can use any html or tailwindcss classes. do not add any commentary, just output the html code, as if it is going to be input into a file. design spec: ${prompt}`}] }
      )
      const newGeneratedCode = {
        html: response.message.content,  // assuming prompt is a string
        css: initialContent.css,
        config: initialContent.config,
      };
      setGeneratedCode(newGeneratedCode);
    }
    catch(e){
      toast.error("window.ai code generation failed with error: " + e.message)
      let response = { message: { content: 
        `<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline">window.ai code generation failed with error: ${e.message}</span>
        </div>`
      } }
      const newGeneratedCode = {
        html: response.message.content,  // assuming prompt is a string
        css: initialContent.css,
        config: initialContent.config,
      };
      setGeneratedCode(newGeneratedCode);
    }
    finally{
      setGenerationLoading(false)
    }
  };


  useEffect(() => {
    setDirty(true)
  }, [
    activeTab,
    size.layout,
    responsiveSize.width,
    responsiveSize.height,
    responsiveDesignMode,
  ])

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
      inject({ html: generatedCode.html })
      compileNow(generatedCode)
    }
  }, [generatedCode])

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
      setDirty(true)
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
            ? document.documentElement.clientHeight - HEADER_HEIGHT
            : document.documentElement.clientWidth

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
          ? document.documentElement.clientWidth
          : document.documentElement.clientHeight - HEADER_HEIGHT
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
     <Toaster/>
      <Header
        layout={size.layout}
        onChangeLayout={(layout) => setSize((size) => ({ ...size, layout }))}
        responsiveDesignMode={responsiveDesignMode}
        onToggleResponsiveDesignMode={() =>
          setResponsiveDesignMode(!responsiveDesignMode)
        }
      >
        {/* <Share
          editorRef={editorRef}
          onShareStart={onShareStart}
          onShareComplete={onShareComplete}
          dirty={dirty}
          initialPath={initialPath}
          layout={size.layout}
          responsiveSize={responsiveDesignMode ? responsiveSize : undefined}
          activeTab={activeTab}
        /> */}
      </Header>
      <div class="flex items-center justify-center md:justify-start md:w-1/2 mx-auto pb-5 space-x-4">
  <input 
  onChange={(e) => {
    setPrompt(e.target.value)
  }
  }

  onKeyDown={(e) => {
    if (e.key === 'Enter') {
      handleGenerateCode();
    }
  }}
    className="flex-grow bg-white shadow-lg border-0 rounded-lg py-2 px-3 text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" 
    placeholder='Enter your design specification' />

  <button
  disabled={generationLoading}
  onClick={() => handleGenerateCode()}
  className="text-white font-semibold py-2 px-4 rounded-lg shadow-lg bg-blue-500 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
>
  {generationLoading ? (
   <> <svg aria-hidden="true" role="status" className="inline w-4 h-4 mr-3 text-white animate-spin" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
   <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="#E5E7EB"/>
   <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentColor"/>
   </svg>
   Generating...</>
  ) : (
    "Generate Code"
  )}
</button>

</div>

      <main className="flex-auto relative border-t border-gray-200 dark:border-gray-800">
        {initialContent && typeof size.current !== 'undefined' ? (
          <>
            {(!isMd || size.layout !== 'preview') && (
              <TabBar
                width={size.layout === 'vertical' ? size.current : '100%'}
                isLoading={isLoading}
                showPreviewTab={!isMd}
                activeTab={
                  isMd || activePane === 'editor' ? activeTab : 'preview'
                }
                onChange={(tab) => {
                  if (tab === 'preview') {
                    setActivePane('preview')
                  } else {
                    setActivePane('editor')
                    setActiveTab(tab)
                  }
                }}
              />
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
                    initialContent={generatedCode}
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
                    // compileNow(initialContent)
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

export default function App({ errorCode, ...props }) {
  if (errorCode) {
    return <Error statusCode={errorCode} />
  }
  return <Pen {...props} />
}

export async function getServerSideProps({ req, params, res, query }) {
  // checks if the user is logged in
  // const { sdk } = await getSdk(req, res);
  // if (!sdk)
  //   return {
  //     redirect: {
  //       destination: "/ssr",
  //       permanent: false,
  //     },
  //   };

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

  if (params.slug.length !== 1) {
    return {
      props: {
        errorCode: 404,
      },
    }
  }

  try {
    const { Item: initialContent } = await get({
      ID: params.slug[0],
    })

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
