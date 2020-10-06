import { sizeToString } from './size'

export function getLayoutQueryString({ layout, responsiveSize, file }) {
  const params = {
    layout: ['vertical', 'horizontal', 'preview'].includes(layout)
      ? layout
      : undefined,
    size: sizeToString(responsiveSize),
    file: ['html', 'css', 'config'].includes(file) ? file : undefined,
  }
  return Object.keys(params)
    .filter((key) => params[key])
    .reduce((acc, key, i) => {
      if (i === 0) return `?${key}=${params[key]}`
      return `${acc}&${key}=${params[key]}`
    }, '')
}
