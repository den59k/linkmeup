export const nanoid = () => {
  const firstPart = (Math.random() * 46656) | 0;
  const secondPart = (Math.random() * 46656) | 0;
  const firstPartStr = ("000" + firstPart.toString(36)).slice(-3);
  const secondPartStr = ("000" + secondPart.toString(36)).slice(-3);
  return firstPartStr + secondPartStr;
}

type SerializeFunction = {
  id: string,
  callback: (...args: any) => void
}

const traverseObject = (obj: any, resources: Buffer[], methods: SerializeFunction[]): any => {
  if (typeof obj === "function") {
    const id = nanoid()
    methods.push({ id, callback: obj })
    return { _linkmeup_type: "function", _linkmeup_id: id }
  }
    
  if (typeof obj !== "object") return obj

  if (obj instanceof Buffer) {
    resources.push(obj)
    return { _linkmeup_type: "buffer", _linkmeup_length: obj.byteLength }
  }

  if (Array.isArray(obj)) {
    const arr = []
    for (let i = 0; i < obj.length; i++) {
      arr[i] = traverseObject(obj[i], resources, methods)
    }
    return arr
  }

  const newObj: typeof obj = {}
  for (let [ key, value ] of Object.entries(obj)) {
    newObj[key] = traverseObject(value, resources, methods)
  }
  return newObj
}

const inverseObject = (obj: any, buffer: Buffer, counter: { value: number }, callback: (...args: any) => void) => {
  if (typeof obj !== "object") return obj
  if (!obj) return obj

  if ("_linkmeup_type" in obj && "_linkmeup_length" in obj) {
    const length = obj["_linkmeup_length"] as number
    const buff = buffer.subarray(counter.value, counter.value+length)
    counter.value += length
    return buff
  }

  if ("_linkmeup_type" in obj && obj["_linkmeup_type"] === "function" && "_linkmeup_id" in obj) {
    const id = obj["_linkmeup_id"]
    return (...args: any) => callback(id, args)
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      obj[i] = inverseObject(obj[i], buffer, counter, callback)
    }
  }
  for (let [ key, value ] of Object.entries(obj)) {
    obj[key] = inverseObject(value, buffer, counter, callback)
  }

  return obj
}

export const writeMessage = (args: any) => {
  const resources: Buffer[] = []
  const functions: SerializeFunction[] = []
  const a = traverseObject(args, resources, functions)
  const text = JSON.stringify(a)

  const jsonBody = Buffer.from(text, "utf-8")
  const jsonLength = jsonBody.byteLength

  const body = Buffer.concat([ jsonBody, ...resources ])

  return { body, headers: resources.length > 0? { "x-json-length": jsonLength }: {}, functions }
}

export const parseMessage = (buffer: Buffer, headers: any, callback: (...args: any) => void) => {

  const jsonLength = headers["x-json-length"] || buffer.byteLength
  const counter = { value: jsonLength }

  const jsonBody = JSON.parse(buffer.subarray(0, jsonLength).toString("utf-8"))

  const obj = inverseObject(jsonBody, buffer, counter, callback)

  return obj
}