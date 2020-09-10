import PQueue from 'p-queue'

export function createWorkerQueue(Worker) {
  const worker = new Worker()
  const queue = new PQueue({ concurrency: 1 })
  return {
    worker,
    emit(data) {
      queue.clear()
      const _id = performance.now()
      worker.postMessage({ _current: _id })
      return queue.add(
        () =>
          new Promise((resolve) => {
            function onMessage(event) {
              if (event.data._id !== _id) return
              worker.removeEventListener('message', onMessage)
              resolve(event.data)
            }
            worker.addEventListener('message', onMessage)
            worker.postMessage({ _id, ...data })
          })
      )
    },
    terminate() {
      worker.terminate()
    },
  }
}

export function requestResponse(worker, data) {
  return new Promise((resolve) => {
    const _id = performance.now()
    function onMessage(event) {
      if (event.data._id !== _id) return
      worker.removeEventListener('message', onMessage)
      resolve(event.data)
    }
    worker.addEventListener('message', onMessage)
    worker.postMessage({ _id, ...data })
  })
}
