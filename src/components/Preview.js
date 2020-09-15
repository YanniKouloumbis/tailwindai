import { forwardRef } from 'react'

export const Preview = forwardRef(({ initialCss = '', ...props }, ref) => {
  return (
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
  )
})
