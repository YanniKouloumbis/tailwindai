import { forwardRef, useEffect, useLayoutEffect, useState, useRef } from 'react'

export const Preview = forwardRef(
  (
    {
      initialCss = '',
      responsiveDesignMode = false,
      onLoad,
      className = '',
      iframeClassName = '',
    },
    ref
  ) => {
    const containerRef = useRef()
    const [size, setSize] = useState({})
    const [responsiveSize, setResponsiveSize] = useState({
      width: 540,
      height: 720,
      zoom: 1,
    })
    const [resizing, setResizing] = useState()
    const timeout = useRef()

    useEffect(() => {
      let isInitial = true
      const observer = new ResizeObserver(() => {
        window.clearTimeout(timeout.current)
        const rect = containerRef.current.getBoundingClientRect()
        setSize({
          visible: !isInitial,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        })
        timeout.current = window.setTimeout(() => {
          setSize((size) => ({ ...size, visible: false }))
        }, 1000)
        isInitial = false
      })
      observer.observe(containerRef.current)
      return () => {
        observer.disconnect()
      }
    }, [])

    useLayoutEffect(() => {
      function constrainWidth(desiredWidth) {
        const zoom =
          desiredWidth > size.width - 34 ? (size.width - 34) / desiredWidth : 1
        return {
          width: Math.min(
            Math.max(50, Math.round(desiredWidth * (1 / zoom))),
            Math.round((size.width - 34) * (1 / zoom))
          ),
          zoom,
        }
      }
      function constrainHeight(desiredHeight) {
        const zoom =
          desiredHeight > size.height - 17 - 40
            ? (size.height - 17 - 40) / desiredHeight
            : 1
        return {
          height: Math.min(
            Math.max(50, Math.round(desiredHeight * (1 / zoom))),
            Math.round((size.height - 17 - 40) * (1 / zoom))
          ),
          zoom,
        }
      }
      function constrainSize(desiredWidth, desiredHeight) {
        const { width, zoom: widthZoom } = constrainWidth(desiredWidth)
        const { height, zoom: heightZoom } = constrainHeight(desiredHeight)
        return {
          width,
          height,
          zoom: Math.min(widthZoom, heightZoom),
        }
      }

      if (size.width && size.height) {
        setResponsiveSize(({ width, height }) => constrainSize(width, height))
      }

      if (resizing) {
        function onMouseMove(e) {
          if (resizing.handle === 'bottom') {
            document.body.classList.add('cursor-ns-resize')
            setResponsiveSize(({ width }) =>
              constrainSize(
                width,
                resizing.startHeight + (e.clientY - resizing.startY)
              )
            )
          } else if (resizing.handle === 'left') {
            document.body.classList.add('cursor-ew-resize')
            setResponsiveSize(({ height }) =>
              constrainSize(
                resizing.startWidth - (e.clientX - resizing.startX) * 2,
                height
              )
            )
          } else if (resizing.handle === 'right') {
            document.body.classList.add('cursor-ew-resize')
            setResponsiveSize(({ height }) =>
              constrainSize(
                resizing.startWidth + (e.clientX - resizing.startX) * 2,
                height
              )
            )
          } else if (resizing.handle === 'bottom-right') {
            document.body.classList.add('cursor-nwse-resize')
            setResponsiveSize(() =>
              constrainSize(
                resizing.startWidth + (e.clientX - resizing.startX) * 2,
                resizing.startHeight + (e.clientY - resizing.startY)
              )
            )
          }
        }
        function onMouseUp() {
          if (resizing.handle === 'bottom') {
            document.body.classList.remove('cursor-ns-resize')
          } else if (resizing.handle === 'left') {
            document.body.classList.remove('cursor-ew-resize')
          } else if (resizing.handle === 'right') {
            document.body.classList.remove('cursor-ew-resize')
          } else if (resizing.handle === 'bottom-right') {
            document.body.classList.remove('cursor-nwse-resize')
          }
          setResizing()
        }
        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('mouseup', onMouseUp)
        return () => {
          window.removeEventListener('mousemove', onMouseMove)
          window.removeEventListener('mouseup', onMouseUp)
        }
      }
    }, [resizing, size])

    return (
      <div
        className={`absolute inset-0 w-full h-full flex flex-col ${className}`}
        ref={containerRef}
      >
        {responsiveDesignMode && (
          <div className="flex-none text-center text-xs tabular-nums h-10 flex items-center justify-center">
            <div>
              {responsiveSize.width}px{' '}
              <span className="text-sm font-medium">×</span>{' '}
              {responsiveSize.height}px ({Math.round(responsiveSize.zoom * 100)}
              %)
            </div>
          </div>
        )}
        <div
          className="flex-auto grid justify-center"
          style={
            responsiveDesignMode
              ? {
                  gridTemplateColumns: '1.0625rem min-content 1.0625rem',
                  gridTemplateRows: 'min-content 1.0625rem',
                }
              : { gridTemplateColumns: '100%' }
          }
        >
          {responsiveDesignMode && (
            <div
              className="cursor-ew-resize select-none bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-400 transition-colors duration-150 border border-r-0 border-gray-200 dark:border-gray-700 flex items-center justify-center"
              onMouseDown={(e) =>
                setResizing({
                  handle: 'left',
                  startWidth: responsiveSize.width,
                  startX: e.clientX,
                })
              }
            >
              <svg
                viewBox="0 0 6 16"
                width={6}
                height={16}
                fill="none"
                stroke="currentColor"
              >
                <path d="M 0.5 0 V 16 M 5.5 0 V 16" />
              </svg>
            </div>
          )}
          <div
            className={`relative ${
              responsiveDesignMode
                ? 'border border-gray-200 dark:border-gray-700 overflow-hidden'
                : ''
            }`}
            style={
              responsiveDesignMode
                ? {
                    width: Math.round(
                      responsiveSize.width * responsiveSize.zoom
                    ),
                    height: Math.round(
                      responsiveSize.height * responsiveSize.zoom
                    ),
                  }
                : {}
            }
          >
            <iframe
              ref={ref}
              title="Preview"
              style={
                responsiveDesignMode
                  ? {
                      width: responsiveSize.width,
                      height: responsiveSize.height,
                      marginLeft:
                        (responsiveSize.width -
                          Math.round(
                            responsiveSize.width * responsiveSize.zoom
                          )) /
                        -2,
                      transformOrigin: 'top',
                      transform: `scale(${responsiveSize.zoom})`,
                    }
                  : {}
              }
              onLoad={onLoad}
              className={`absolute inset-0 w-full h-full bg-white ${
                resizing ? 'pointer-events-none select-none' : ''
              } ${iframeClassName}`}
              srcDoc={`
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style id="_style">${initialCss}</style>
                    <script>
                    var hasHtml = false
                    var hasCss = ${initialCss ? 'true' : 'false'}
                    var visible = false
                    window.addEventListener('message', (e) => {
                      if ('css' in e.data) {
                        const style = document.getElementById('_style')
                        const newStyle = document.createElement('style')
                        newStyle.id = '_style'
                        newStyle.innerHTML = e.data.css
                        style.parentNode.replaceChild(newStyle, style)
                        hasCss = true
                      }
                      if ('html' in e.data) {
                        document.body.innerHTML = e.data.html
                        hasHtml = true
                      }
                      if (!visible && hasHtml && hasCss) {
                        visible = true
                        document.body.style.display = ''
                      }
                    })
                    </script>
                  </head>
                  <body style="display:none">
                  </body>
                </html>
              `}
            />
          </div>
          {responsiveDesignMode && (
            <>
              <div
                className="cursor-ew-resize select-none bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-400 transition-colors duration-150 border border-b-0 border-l-0 border-gray-200 dark:border-gray-700 flex items-center justify-center"
                onMouseDown={(e) =>
                  setResizing({
                    handle: 'right',
                    startWidth: responsiveSize.width,
                    startX: e.clientX,
                  })
                }
              >
                <svg
                  viewBox="0 0 6 16"
                  width={6}
                  height={16}
                  fill="none"
                  stroke="currentColor"
                >
                  <path d="M 0.5 0 V 16 M 5.5 0 V 16" />
                </svg>
              </div>
              <div
                className="col-start-2 cursor-ns-resize select-none bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-400 transition-colors duration-150 border border-t-0 border-r-0 border-gray-200 dark:border-gray-700 flex items-center justify-center"
                onMouseDown={(e) =>
                  setResizing({
                    handle: 'bottom',
                    startHeight: responsiveSize.height,
                    startY: e.clientY,
                  })
                }
              >
                <svg
                  viewBox="0 0 16 6"
                  width={16}
                  height={6}
                  fill="none"
                  stroke="currentColor"
                >
                  <path d="M 0 0.5 H 16 M 0 5.5 H 16" />
                </svg>
              </div>
              <div
                className="cursor-nwse-resize select-none bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-400 transition-colors duration-150 border border-t-0 border-l-0 border-gray-200 dark:border-gray-700 flex items-center justify-center"
                onMouseDown={(e) =>
                  setResizing({
                    handle: 'bottom-right',
                    startWidth: responsiveSize.width,
                    startHeight: responsiveSize.height,
                    startX: e.clientX,
                    startY: e.clientY,
                  })
                }
              >
                <svg
                  viewBox="0 0 16 6"
                  width={16}
                  height={6}
                  fill="none"
                  stroke="currentColor"
                  className="transform -translate-x-0.5 -translate-y-0.5 -rotate-45"
                >
                  <path d="M 0 0.5 H 16 M 0 5.5 H 16" />
                </svg>
              </div>
            </>
          )}
        </div>
        {!responsiveDesignMode && size.visible && (
          <div className="absolute top-2 right-2 rounded-md text-xs leading-6 px-2 tabular-nums bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600">
            {size.width}px <span className="text-sm font-medium">×</span>{' '}
            {size.height}px
          </div>
        )}
      </div>
    )
  }
)
