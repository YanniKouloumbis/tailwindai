import LZString from 'lz-string'

let current

addEventListener('message', (event) => {
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

  respond({
    compressed: LZString.compressToEncodedURIComponent(event.data.string),
  })
})
