let decorations = []
let stylesheet

export function renderColorDecorators(editor, newDecorations) {
  if (!stylesheet) {
    stylesheet = document.createElement('style')
    document.head.appendChild(stylesheet)
  }

  stylesheet.innerHTML = newDecorations
    .map(
      ({ color }, i) => `._color-block-${i} {
          content: '';
          box-sizing: border-box;
          display: inline-block;
          width: 0.8em;
          height: 0.8em;
          margin: 0.1em 0.2em 0;
          border: 0.1em solid black;
          background-color: ${color};
        }`
    )
    .join('')

  decorations = editor.deltaDecorations(
    decorations,
    newDecorations.map(({ range }, i) => ({
      range,
      options: { beforeContentClassName: `_color-block-${i}` },
    }))
  )
}
