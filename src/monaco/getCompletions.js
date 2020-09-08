import dlv from 'dlv'
import lineColumn from 'line-column'
import { TinyColor } from '@ctrl/tinycolor'

export function getCompletions(state, text) {
  if (!state) return []

  const classAttr = findLast(/\sclass="([^"]*)$/g, text)

  if (classAttr === null) {
    return []
  }

  const range = lineColumn(text + '\n').fromIndex(classAttr.index + 8)

  return completionsFromClassList(state, classAttr[0].substr(8), {
    startLineNumber: range.line,
    endLineNumber: range.line,
    startColumn: range.col,
    endColumn: range.col + classAttr[1].length,
  })
}

function completionsFromClassList(state, classList, classListRange) {
  let classNames = classList.split(/[\s+]/)
  const partialClassName = classNames[classNames.length - 1]
  let sep = state.separator
  let parts = partialClassName.split(sep)
  let subset
  let subsetKey = []
  let isSubset = false

  let replacementRange = {
    ...classListRange,
    startColumn: classListRange.endColumn - partialClassName.length,
  }

  for (let i = parts.length - 1; i > 0; i--) {
    let keys = parts.slice(0, i).filter(Boolean)
    subset = dlv(state.classNames, keys)
    if (typeof subset !== 'undefined' && typeof subset.__rule === 'undefined') {
      isSubset = true
      subsetKey = keys
      replacementRange = {
        ...replacementRange,
        startColumn:
          replacementRange.startColumn + keys.join(sep).length + sep.length,
      }
      break
    }
  }

  return Object.keys(isSubset ? subset : state.classNames)
    .map((className, index) => {
      let label = className
      let kind = 14 // Constant
      let documentation = null
      let command
      let sortText = naturalExpand(index)
      if (isContextItem(state, [...subsetKey, className])) {
        kind = 8 // Module
        command = { title: '', id: 'editor.action.triggerSuggest' }
        label += sep
        sortText = '-' + sortText // move to top
      } else {
        const color = getColor(state, [className])
        if (color !== null) {
          kind = 19 // Color
          if (typeof color !== 'string' && color.a !== 0) {
            documentation = color.toRgbString()
          }
        }
      }

      const item = {
        label,
        kind,
        documentation,
        command,
        sortText,
        data: [...subsetKey, className],
        insertText: label,
        range: replacementRange,
      }

      return item
    })
    .filter((item) => item !== null)
}

function pad(n) {
  return ('00000000' + n).substr(-8)
}

function naturalExpand(value) {
  let str = typeof value === 'string' ? value : value.toString()
  return str.replace(/\d+/g, pad)
}

function isObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]'
}

function isContextItem(state, keys) {
  const item = dlv(state.classNames, keys)
  return Boolean(
    isObject(item) &&
      !item.__rule &&
      !Array.isArray(item) &&
      state.context[keys[keys.length - 1]]
  )
}

function findAll(re, str) {
  let match
  let matches = []
  while ((match = re.exec(str)) !== null) {
    matches.push({ ...match })
  }
  return matches
}

function findLast(re, str) {
  const matches = findAll(re, str)
  if (matches.length === 0) {
    return null
  }
  return matches[matches.length - 1]
}

function removeMeta(obj) {
  let result = {}
  for (let key in obj) {
    if (key.substr(0, 2) === '__') continue
    if (isObject(obj[key])) {
      result[key] = removeMeta(obj[key])
    } else {
      result[key] = obj[key]
    }
  }
  return result
}

function flatten(arrays) {
  return [].concat.apply([], arrays)
}

const COLOR_PROPS = [
  'caret-color',
  'color',
  'column-rule-color',
  'background-color',
  'border-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'fill',
  'outline-color',
  'stop-color',
  'stroke',
  'text-decoration-color',
]

function isKeyword(value) {
  return ['transparent', 'currentcolor'].includes(value.toLowerCase())
}

function createColor(str) {
  if (isKeyword(str)) {
    return str
  }

  // matches: rgba(<r>, <g>, <b>, var(--bg-opacity))
  // TODO: support other formats? e.g. hsla, css level 4
  const match = str.match(
    /^\s*rgba\(\s*(?<r>[0-9]{1,3})\s*,\s*(?<g>[0-9]{1,3})\s*,\s*(?<b>[0-9]{1,3})\s*,\s*var/
  )

  if (match) {
    return new TinyColor({
      r: match.groups.r,
      g: match.groups.g,
      b: match.groups.b,
    })
  }

  return new TinyColor(str)
}

function dedupe(arr) {
  return arr.filter((value, index, self) => self.indexOf(value) === index)
}

export function ensureArray(value) {
  return Array.isArray(value) ? value : [value]
}

function getColor(state, keys) {
  const item = dlv(state.classNames, keys)
  if (!item.__rule) return null
  const props = Object.keys(removeMeta(item))
  if (props.length === 0) return null
  const nonCustomProps = props.filter((prop) => !prop.startsWith('--'))

  const areAllCustom = nonCustomProps.length === 0

  if (
    !areAllCustom &&
    nonCustomProps.some((prop) => !COLOR_PROPS.includes(prop))
  ) {
    // they should all be color-based props
    return null
  }

  const propsToCheck = areAllCustom ? props : nonCustomProps

  const colors = flatten(
    propsToCheck.map((prop) => ensureArray(item[prop]).map(createColor))
  )

  // check that all of the values are valid colors
  if (colors.some((color) => typeof color !== 'string' && !color.isValid)) {
    return null
  }

  // check that all of the values are the same color, ignoring alpha
  const colorStrings = dedupe(
    colors.map((color) =>
      typeof color === 'string' ? color : `${color.r}-${color.g}-${color.b}`
    )
  )
  if (colorStrings.length !== 1) {
    return null
  }

  if (isKeyword(colorStrings[0])) {
    return colorStrings[0]
  }

  const nonKeywordColors = colors.filter((color) => typeof color !== 'string')

  const alphas = dedupe(nonKeywordColors.map((color) => color.a))

  if (alphas.length === 1) {
    return nonKeywordColors[0]
  }

  if (alphas.length === 2 && alphas.includes(0)) {
    return nonKeywordColors.find((color) => color.a !== 0)
  }

  return null
}
