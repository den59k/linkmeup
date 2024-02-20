import { ClientRequest, IncomingMessage, ServerResponse } from "http";
import { mapObject } from "./mapObject";
import { PassThrough, Readable, Stream, Transform, Writable } from "stream";

const INT_SIZE = 4

export const parseBody = async (req: IncomingMessage, streams?: Transform[], methodsCache?: any[]) => {

  const buffers: Buffer[] = [];
  for await (const chunk of req) {
    buffers.push(chunk);
  }
  const data = Buffer.concat(buffers)
  
  const type = req.headers["content-type"]
  
  if (type === "application/json") {
    return JSON.parse(data.toString())
  }
  
  const buffersCount = data.readUint32LE(0)
  const innerBuffers: Buffer[] = []

  let index = (1+buffersCount)*INT_SIZE
  for (let i = 0; i < buffersCount; i++) {
    const length = data.readUint32LE((i + 1)*INT_SIZE)
    innerBuffers.push(data.subarray(index, index+length))
    index += length
  }

  const json = JSON.parse(innerBuffers[0].toString())
  return inverseObj(json, innerBuffers.slice(1), streams, methodsCache)
}

export const inverseObj = (obj: any, buffers: Buffer[], streams?: Transform[], methodsCache?: any[]) => {
  return mapObject(obj, (item) => {
    if (typeof item !== 'object' || item === null || !("_linkmeup_type" in item)) return
    if (item["_linkmeup_type"] === "buffer") {
      return buffers[item['index']]
    }

    if (item["_linkmeup_type"] === "stream" && streams) {
      const passthrough = new PassThrough()
      streams.push(passthrough)
      return passthrough
    }

    if (item["_linkmeup_type"] === "function" && methodsCache) {
      const index = item["index"]
      return (...args: any) => {
        const calls = methodsCache[index]?.calls ?? 0
        methodsCache[index] = { args, calls: calls+1 }
      }
    }
  })
}

export const writeBodyAsJson = (obj: any) => {
  return Buffer.from(JSON.stringify(obj))
}

export const writeBody = (reply: ClientRequest | ServerResponse, obj: any, streams?: Readable[], methods?: Function[]) => {

  const buffers: Buffer[] = []
  traverseObj(obj, buffers, streams, methods)
  const jsonPayload = Buffer.from(JSON.stringify(obj))

  if (buffers.length === 0 && (!streams || streams.length === 0)) {
    reply.setHeader("content-type", "application/json")
    reply.setHeader("content-length", jsonPayload.byteLength)
    if ("writeHead" in reply) {
      reply.writeHead(200)
    }
    reply.end(jsonPayload)
    return
  }
  
  buffers.unshift(jsonPayload)
  const controls = new Uint32Array((buffers.length+1))
  controls[0] = buffers.length
  for (let i = 0; i < buffers.length; i++) {
    controls[i+1] = buffers[i].byteLength
  }
  buffers.unshift(Buffer.from(controls.buffer))
  const response = Buffer.concat(buffers)

  reply.setHeader("content-type", "application/octet-stream")
  reply.setHeader("content-length", response.byteLength)
  if ("writeHead" in reply) {
    reply.writeHead(200)
  }
  reply.end(response)
}

export const traverseObj = (obj: any, buffers: Buffer[], streams?: Readable[], methods?: Function[]) => {
  return mapObject(obj, (item) => {
    if (item instanceof Stream && streams) {
      streams.push(item as Readable)
      return { _linkmeup_type: "stream", index: streams.length - 1 }
    }
    if (Buffer.isBuffer(item)) {
      buffers.push(item)
      return { _linkmeup_type: "buffer", index: buffers.length - 1 }
    }
    if (typeof item === "function" && methods) {
      methods.push(item)
      return { _linkmeup_type: "function", index: methods.length - 1 }
    }
  })
}
