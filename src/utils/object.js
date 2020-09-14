export function removeFunctions(obj) {
  for (let prop in obj) {
    if (typeof obj[prop] === 'function') {
      if (Array.isArray(obj)) {
        obj.splice(prop, 1)
      } else {
        delete obj[prop]
      }
    } else if (isObject(obj[prop]) || Array.isArray(obj[prop])) {
      removeFunctions(obj[prop])
    }
  }
}

export function isObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]'
}
