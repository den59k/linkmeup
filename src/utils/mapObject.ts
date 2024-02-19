
export const mapObject = (obj: any, callback: (obj: any) => any) => {
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const resp = callback(obj[i])
      if (resp && resp !== obj[i]) {
        obj[i] = resp
        continue
      }
      mapObject(obj[i], callback)
    }
    return obj
  }

  if (typeof obj === "object") {
    if (obj === null) return obj
    for (let [key, value] of Object.entries(obj)) {
      const resp = callback(value)
      if (resp && value !== resp) {
        obj[key] = resp
        continue
      }
      mapObject(value, callback)
    }
    return obj
  }

  return obj
}
