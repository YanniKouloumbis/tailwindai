export function validateJavaScript(script) {
  return new Promise((resolve) => {
    const stringToEval = `throw new Error('Parsing successful!');function _hmm(){\n${script}\n}`
    const $script = document.createElement('script')
    $script.innerHTML = stringToEval

    window.addEventListener('error', function onError(errorEvent) {
      errorEvent.preventDefault()
      window.removeEventListener('error', onError)
      $script.parentNode.removeChild($script)
      if (errorEvent.message.indexOf('Parsing successful') !== -1) {
        resolve({ isValid: true })
        return
      }
      resolve({
        isValid: false,
        error: {
          line: errorEvent.lineno - 1,
          message: errorEvent.error.toString(),
        },
      })
    })
    document.body.appendChild($script)
  })
}
