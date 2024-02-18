export class MultiMap<T, K> {
  _map = new Map<T, K[]>()

  get size() {
    return this._map.size
  }

  add(key: T, value: K) {
    const arr = this._map.get(key)
    if (!arr) {
      this._map.set(key, [ value ])
    } else {
      arr.push(value)
    }
  }

  remove(key: T, value: K) {
    const arr = this._map.get(key)
    if (!arr) return false
    const newArr = arr.filter(item => item !== value)
    if (newArr.length === arr.length) return false
    if (newArr.length === 0) {
      this._map.delete(key)
    } else {
      this._map.set(key, newArr)
    }
    return true
  }

  has(key: T) {
    return this._map.has(key)
  }

  get(key: T) {
    return this._map.get(key) || []
  }

  forEach(key: T, callback: (val: K) => void) {
    const arr = this._map.get(key)
    if (!arr) return
    arr.forEach(callback)
  }

  map(key: T, callback: (val: K) => void) {
    const arr = this._map.get(key)
    if (!arr) return []
    return arr.map(callback)
  }
}

export const createEventEmitter = <Events extends Record<string, (...args: any) => void>>() => {
  const _events = new MultiMap<keyof Events, any>()
  const addEventListener = <T extends keyof Events>(channel: T, event: Events[T]) => {
    _events.add(channel, event)
  }
  const removeEventListener = <T extends keyof Events>(channel: T, event: Events[T]) => {
    _events.remove(channel, event)
  }
  const dispatch = <T extends keyof Events>(channel: T, ...args: Parameters<Events[T]>) => {
    return Promise.all(_events.map(channel, item => item(...args as any) as ReturnType<Events[T]>))
  }

  return {
    addEventListener,
    removeEventListener,
    dispatch
  }
}