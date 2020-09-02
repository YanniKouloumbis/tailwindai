import postcss from 'postcss'
import tailwindcss from 'tailwindcss'

const handler = {
  get: () => () => {},
}

self.fs = new Proxy({}, handler)
self.fsextra = new Proxy({}, handler)
self.fsrealpath = new Proxy({}, handler)
self.resolve = new Proxy({}, handler)

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
    await eval(`
      (async function(module){
        const require = async (m) => {
          if (!m) throw Error('No module')
          const result = await import('https://cdn.skypack.dev/' + m)
          return result.default || result
        }
        ${event.data.config.replace(/(^|\s)require\(/g, '$1await require(')}
      })(mod)
    `)
  } catch (_) {
    return respond({ error: true })
  }

  try {
    const { css } = await postcss([tailwindcss(mod.exports)]).process(
      event.data.css,
      { from: undefined }
    )
    respond({ css })
  } catch (_) {
    respond({ error: true })
  }
})
