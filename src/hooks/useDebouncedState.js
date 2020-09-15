import { useState, useEffect, useRef } from 'react'

export function useDebouncedState(initialValue, timeout = 100) {
  const [value, setValue] = useState(initialValue)
  const [debouncedValue, setDebouncedValue] = useState(initialValue)
  const handler = useRef()

  useEffect(() => {
    handler.current = window.setTimeout(() => {
      setDebouncedValue(value)
    }, timeout)
    return () => {
      window.clearTimeout(handler.current)
    }
  }, [value, timeout])

  return [
    // X
    debouncedValue,
    // setX
    setValue,
    // setXImmediate
    (newValue) => {
      window.clearTimeout(handler.current)
      setDebouncedValue(newValue)
    },
    // cancelSetX
    () => window.clearTimeout(handler.current),
  ]
}
