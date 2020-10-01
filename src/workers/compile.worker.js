import postcss from 'postcss'
import tailwindcss from 'tailwindcss'
import featureFlags from 'tailwindcss/lib/featureFlags'
import resolveConfig from 'tailwindcss/resolveConfig'
import extractClasses from './extractClasses'
import { removeFunctions } from '../utils/object'
import { getVariants } from '../utils/getVariants'
const applyComplexClasses = require('tailwindcss/lib/flagged/applyComplexClasses')

// TODO
let _applyComplexClasses = applyComplexClasses.default
applyComplexClasses.default = (...args) => {
  let fn = _applyComplexClasses(...args)
  return (css) => {
    css.walkRules((rule) => {
      const newSelector = rule.selector.replace(
        /__TWSEP__(.*?)__TWSEP__/g,
        '$1'
      )
      if (newSelector !== rule.selector) {
        rule.before(
          postcss.comment({ text: '__ORIGINAL_SELECTOR__:' + rule.selector })
        )
        rule.selector = newSelector
      }
    })
    fn(css)
    css.walkComments((comment) => {
      if (comment.text.startsWith('__ORIGINAL_SELECTOR__:')) {
        comment.next().selector = comment.text.replace(
          /^__ORIGINAL_SELECTOR__:/,
          ''
        )
        comment.remove()
      }
    })
  }
}

let current

addEventListener('message', async (event) => {
  if (event.data._current) {
    current = event.data._current
    return
  }

  function respond(data) {
    setTimeout(() => {
      if (event.data._id === current) {
        postMessage({ _id: event.data._id, ...data })
      } else {
        postMessage({ _id: event.data._id, canceled: true })
      }
    }, 0)
  }

  let mod = {}

  try {
    await (0, eval)('import("")')
  } catch (error) {
    if (error instanceof TypeError) {
      self.importShim = (0, eval)('u=>import(u)')
    } else {
      importScripts('https://unpkg.com/shimport@2.0.4/index.js')
      self.importShim = __shimport__.load
    }
  }

  class RequireError extends Error {
    constructor(message, line) {
      super(message)
      this.name = 'RequireError'
      this.line = line
    }
  }

  const before = `(async function(module){
    const require = async (m, line) => {
      if (typeof m !== 'string') {
        throw new RequireError('The "id" argument must be of type string. Received ' + typeof m, line)
      }
      if (m === '') {
        throw new RequireError("The argument 'id' must be a non-empty string. Received ''", line)
      }
      let result
      try {
        result = await self.importShim('https://cdn.skypack.dev/' + m)
      } catch (error) {
        throw new RequireError("Cannot find module '" + m + "'", line)
      }
      return result.default || result
    }`
  const after = `})(mod)`

  try {
    await eval(
      before +
        '\n' +
        event.data.config
          .split('\n')
          .map((line, i) =>
            line.replace(
              /\brequire\(([^(]*)\)/g,
              (_m, id) =>
                `await require(${id.trim() === '' ? 'undefined' : id}, ${
                  i + 1
                })`
            )
          )
          .join('\n') +
        '\n' +
        after
    )
  } catch (error) {
    let line

    if (error instanceof RequireError) {
      line = error.line
    } else if (typeof error.line !== 'undefined') {
      line = error.line - 1 - before.split('\n').length
    } else {
      const lines = error.stack.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const re = /:([0-9]+):([0-9]+)/g
        const matches = []
        let match
        while ((match = re.exec(lines[i])) !== null) {
          matches.push(match)
        }
        if (matches.length > 0) {
          line =
            parseInt(matches[matches.length - 1][1], 10) -
            before.split('\n').length
          break
        }
      }
    }

    return respond({
      error: {
        message: error.message,
        file: 'Config',
        line: typeof line === 'undefined' ? undefined : line,
      },
    })
  }

  let state = {}

  try {
    const separator = mod.exports.separator || ':'
    mod.exports.separator = `__TWSEP__${separator}__TWSEP__`
    const { css, root } = await postcss([
      tailwindcss(mod.exports),
    ]).process(event.data.css, { from: undefined })
    mod.exports.separator = separator
    state.classNames = await extractClasses(root)
    state.separator = separator
    state.config = resolveConfig(mod.exports)
    state.variants = getVariants({ config: state.config, postcss })
    removeFunctions(state.config)
    state.version = '1.8.5'
    state.editor = {
      userLanguages: {},
      capabilities: {},
      globalSettings: {
        validate: true,
        lint: {
          cssConflict: 'warning',
          invalidApply: 'error',
          invalidScreen: 'error',
          invalidVariant: 'error',
          invalidConfigPath: 'error',
          invalidTailwindDirective: 'error',
        },
      },
    }
    state.featureFlags = featureFlags
    const escapedSeparator = separator.replace(/./g, (m) =>
      /[a-z0-9-_]/i.test(m) ? m : `\\${m}`
    )
    respond({
      state,
      css: css.replace(/__TWSEP__.*?__TWSEP__/g, escapedSeparator),
    })
  } catch (error) {
    if (error.toString().startsWith('CssSyntaxError')) {
      const match = error.message.match(
        /^<css input>:([0-9]+):([0-9]+): (.*?)$/
      )
      respond({ error: { message: match[3], file: 'CSS', line: match[1] } })
    } else {
      respond({ error: { message: error.message } })
    }
  }
})
