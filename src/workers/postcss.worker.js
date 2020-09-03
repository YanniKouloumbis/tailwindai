import postcss from 'postcss'
import tailwindcss from 'tailwindcss'
///////////////
import {
  baseUrl as pageBaseUrl,
  resolveImportMap,
  createBlob,
  resolveUrl,
  resolveAndComposeImportMap,
  hasDocument,
  resolveIfNotPlainOrUrl,
  dynamicImport,
  resolvedPromise,
} from './es-module-shims/common.js'
import { init, parse } from 'es-module-lexer/dist/lexer.js'

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
          const result = await self.importShim('https://cdn.skypack.dev/' + m)
          return result.default || result
        }
        ${event.data.config.replace(/\brequire\(/g, 'await require(')}
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

////////////////////////////////////////////////////
///////////////////////////////////////////////////
// https://github.com/guybedford/es-module-shims/blob/master/src/es-module-shims.js

let id = 0
const registry = {}

async function loadAll(load, seen) {
  if (load.b || seen[load.u]) return
  seen[load.u] = 1
  await load.L
  return Promise.all(load.d.map((dep) => loadAll(dep, seen)))
}

let waitingForImportMapsInterval
let firstTopLevelProcess = true
async function topLevelLoad(url, source) {
  if (waitingForImportMapsInterval > 0) {
    clearTimeout(waitingForImportMapsInterval)
    waitingForImportMapsInterval = 0
  }
  await importMapPromise
  await init
  const load = getOrCreateLoad(url, source)
  const seen = {}
  await loadAll(load, seen)
  lastLoad = undefined
  resolveDeps(load, seen)
  const module = await dynamicImport(load.b)
  // if the top-level load is a shell, run its update function
  if (load.s) (await dynamicImport(load.s)).u$_(module)
  return module
}

async function importShim(id, parentUrl) {
  return topLevelLoad(resolve(id, parentUrl || pageBaseUrl))
}

self.importShim = importShim

const meta = {}

const edge = navigator.userAgent.match(/Edge\/\d\d\.\d+$/)

async function importMetaResolve(id, parentUrl = this.url) {
  await importMapPromise
  return resolve(id, `${parentUrl}`)
}

Object.defineProperties(importShim, {
  m: { value: meta },
  l: { value: undefined, writable: true },
  e: { value: undefined, writable: true },
})
importShim.fetch = (url) => fetch(url)
importShim.skip = /^https?:\/\/(cdn\.pika\.dev|dev\.jspm\.io|jspm\.dev)\//
// importShim.load = processScripts;

let lastLoad
function resolveDeps(load, seen) {
  if (load.b || !seen[load.u]) return
  seen[load.u] = 0

  for (const dep of load.d) resolveDeps(dep, seen)

  // "execution"
  const source = load.S
  // edge doesnt execute sibling in order, so we fix this up by ensuring all previous executions are explicit dependencies
  let resolvedSource = edge && lastLoad ? `import '${lastLoad}';` : ''

  const [imports] = load.a

  if (!imports.length) {
    resolvedSource += source
  } else {
    // once all deps have loaded we can inline the dependency resolution blobs
    // and define this blob
    let lastIndex = 0,
      depIndex = 0
    for (const { s: start, e: end, d: dynamicImportIndex } of imports) {
      // dependency source replacements
      if (dynamicImportIndex === -1) {
        const depLoad = load.d[depIndex++]
        let blobUrl = depLoad.b
        if (!blobUrl) {
          // circular shell creation
          if (!(blobUrl = depLoad.s)) {
            blobUrl = depLoad.s = createBlob(
              `export function u$_(m){${depLoad.a[1]
                .map((name) =>
                  name === 'default'
                    ? `$_default=m.default`
                    : `${name}=m.${name}`
                )
                .join(',')}}${depLoad.a[1]
                .map((name) =>
                  name === 'default'
                    ? `let $_default;export{$_default as default}`
                    : `export let ${name}`
                )
                .join(';')}\n//# sourceURL=${depLoad.r}?cycle`
            )
          }
        }
        // circular shell execution
        else if (depLoad.s) {
          resolvedSource +=
            source.slice(lastIndex, start - 1) +
            '/*' +
            source.slice(start - 1, end + 1) +
            '*/' +
            source.slice(start - 1, start) +
            blobUrl +
            source[end] +
            `;import*as m$_${depIndex} from'${depLoad.b}';import{u$_ as u$_${depIndex}}from'${depLoad.s}';u$_${depIndex}(m$_${depIndex})`
          lastIndex = end + 1
          depLoad.s = undefined
          continue
        }
        resolvedSource +=
          source.slice(lastIndex, start - 1) +
          '/*' +
          source.slice(start - 1, end + 1) +
          '*/' +
          source.slice(start - 1, start) +
          blobUrl
        lastIndex = end
      }
      // import.meta
      else if (dynamicImportIndex === -2) {
        meta[load.r] = { url: load.r, resolve: importMetaResolve }
        resolvedSource +=
          source.slice(lastIndex, start) +
          'importShim.m[' +
          JSON.stringify(load.r) +
          ']'
        lastIndex = end
      }
      // dynamic import
      else {
        resolvedSource +=
          source.slice(lastIndex, dynamicImportIndex + 6) +
          'Shim(' +
          source.slice(start, end) +
          ', ' +
          JSON.stringify(load.r)
        lastIndex = end
      }
    }

    resolvedSource += source.slice(lastIndex)
  }

  let sourceMappingResolved = ''
  const sourceMappingIndex = resolvedSource.lastIndexOf('//# sourceMappingURL=')
  if (sourceMappingIndex > -1) {
    const sourceMappingEnd = resolvedSource.indexOf('\n', sourceMappingIndex)
    const sourceMapping = resolvedSource.slice(
      sourceMappingIndex,
      sourceMappingEnd > -1 ? sourceMappingEnd : undefined
    )
    sourceMappingResolved =
      `\n//# sourceMappingURL=` + resolveUrl(sourceMapping.slice(21), load.r)
  }
  load.b = lastLoad = createBlob(
    resolvedSource + sourceMappingResolved + '\n//# sourceURL=' + load.r
  )
  load.S = undefined
}

function getOrCreateLoad(url, source) {
  let load = registry[url]
  if (load) return load

  load = registry[url] = {
    // url
    u: url,
    // response url
    r: undefined,
    // fetchPromise
    f: undefined,
    // source
    S: undefined,
    // linkPromise
    L: undefined,
    // analysis
    a: undefined,
    // deps
    d: undefined,
    // blobUrl
    b: undefined,
    // shellUrl
    s: undefined,
  }

  const depcache = importMap.depcache[url]
  if (depcache)
    depcache.forEach((depUrl) => getOrCreateLoad(resolve(depUrl, url)))

  load.f = (async () => {
    if (!source) {
      const res = await importShim.fetch(url)
      if (!res.ok) throw new Error(`${res.status} ${res.statusText} ${res.url}`)
      load.r = res.url
      const contentType = res.headers.get('content-type')
      if (contentType.match(/^(text|application)\/(x-)?javascript(;|$)/))
        source = await res.text()
      else throw new Error(`Unknown Content-Type "${contentType}"`)
    }
    try {
      load.a = parse(source, load.u)
    } catch (e) {
      console.warn(e)
      load.a = [[], []]
    }
    load.S = source
    return load.a[0]
      .filter((d) => d.d === -1)
      .map((d) => source.slice(d.s, d.e))
  })()

  load.L = load.f.then(async (deps) => {
    load.d = await Promise.all(
      deps.map(async (depId) => {
        let resolved = resolve(depId, load.r || load.u)
        // https://cdn.skypack.dev/-/tailwindcss@v1.7.6-TG1T56mU2GyYfzeRbPoh/dist=es2020,mode=raw/resolveConfig
        const match = resolved.match(
          /https:\/\/cdn\.skypack\.dev\/-\/tailwindcss@.*?mode=raw\/(.*?)$/
        )
        if (match !== null) {
          resolved = `/api/package?file=${match[1]}`
        }
        if (importShim.skip.test(resolved)) return { b: resolved }
        const depLoad = getOrCreateLoad(resolved)
        await depLoad.f
        return depLoad
      })
    )
  })

  return load
}

const importMap = { imports: {}, scopes: {}, depcache: {} }
let importMapPromise = resolvedPromise

function resolve(id, parentUrl) {
  console.log(importMap)
  return (
    resolveImportMap(
      importMap,
      resolveIfNotPlainOrUrl(id, parentUrl) || id,
      parentUrl
    ) || throwUnresolved(id, parentUrl)
  )
}

function throwUnresolved(id, parentUrl) {
  throw Error(
    "Unable to resolve specifier '" +
      id +
      (parentUrl ? "' from " + parentUrl : "'")
  )
}
