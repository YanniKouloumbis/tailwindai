import { TextDocument } from 'vscode-languageserver-textdocument'
import {
  doComplete,
  resolveCompletionItem,
  doValidate,
  doHover,
  getDocumentColors,
} from 'twls-wip'
import {
  asCompletionResult as asMonacoCompletionResult,
  asCompletionItem as asMonacoCompletionItem,
  asDiagnostics as asMonacoDiagnostics,
  asHover as asMonacoHover,
  asRange as asMonacoRange,
} from '../monaco/lspToMonaco'
import { asCompletionItem as asLspCompletionItem } from '../monaco/monacoToLsp'
import CompileWorker from 'worker-loader?publicPath=/_next/&filename=static/[name].[hash].js&chunkFilename=static/chunks/[id].[contenthash].worker.js!./compile.worker.js'
import { createWorkerQueue } from '../utils/workers'
import './subworkers'

const compileWorker = createWorkerQueue(CompileWorker)

let state

addEventListener('message', async (event) => {
  if (event.data.lsp) {
    let result

    function fallback(fn, fallbackValue) {
      if (!state) return fallbackValue
      return fn()
    }

    const document = TextDocument.create(
      event.data.lsp.uri,
      event.data.lsp.language,
      1,
      event.data.lsp.text
    )

    switch (event.data.lsp.type) {
      case 'complete':
        result = await fallback(
          async () =>
            asMonacoCompletionResult(
              await doComplete(state, document, {
                line: event.data.lsp.position.lineNumber - 1,
                character: event.data.lsp.position.column - 1,
              })
            ),
          []
        )
        break
      case 'resolveCompletionItem':
        result = asMonacoCompletionItem(
          resolveCompletionItem(state, asLspCompletionItem(event.data.lsp.item))
        )
        break
      case 'hover':
        const hover = doHover(state, document, {
          line: event.data.lsp.position.lineNumber - 1,
          character: event.data.lsp.position.column - 1,
        })
        if (hover && hover.contents.language === 'css') {
          hover.contents.language = 'tailwindcss'
          hover.contents.value = hover.contents.value.replace(/\t/g, '  ')
        }
        result = fallback(() => asMonacoHover(hover))
        break
      case 'validate':
        result = await fallback(
          async () => asMonacoDiagnostics(await doValidate(state, document)),
          []
        )
        break
      case 'documentColors':
        result = fallback(
          () =>
            getDocumentColors(state, document).map(({ color, range }) => ({
              range: asMonacoRange(range),
              color,
            })),
          []
        )
        break
    }

    return postMessage({ _id: event.data._id, result })
  }

  if (
    typeof event.data.css !== 'undefined' &&
    typeof event.data.config !== 'undefined'
  ) {
    const result = await compileWorker.emit({
      css: event.data.css,
      config: event.data.config,
    })

    if (!result.error && !result.canceled) {
      state = result.state
      postMessage({ _id: event.data._id, css: result.css })
    } else {
      postMessage({ ...result, _id: event.data._id })
    }
  }
})
