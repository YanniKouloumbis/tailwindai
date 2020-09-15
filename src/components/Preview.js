import { forwardRef, useEffect, useState, useRef } from 'react'

export const Preview = forwardRef(({ initialCss = '', ...props }, ref) => {
  const [size, setSize] = useState()
  const timeout = useRef()

  useEffect(() => {
    let isInitial = true
    const observer = new ResizeObserver(() => {
      if (isInitial) {
        isInitial = false
        return
      }
      window.clearTimeout(timeout.current)
      const rect = ref.current.getBoundingClientRect()
      setSize({
        width: rect.width,
        height: rect.height,
      })
      timeout.current = window.setTimeout(() => {
        setSize()
      }, 1000)
    })
    observer.observe(ref.current)
    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <>
      <iframe
        ref={ref}
        title="Preview"
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
        {...props}
      />
      {size && (
        <div className="absolute top-2 right-2 rounded-md text-sm leading-6 px-2 tabular-nums bg-white border border-gray-300">
          {size.width}px × {size.height}px
        </div>
      )}
    </>
  )
})
