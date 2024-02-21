import { request as httpsRequest } from 'https'
import { IncomingMessage, request as httpRequest, ClientRequest } from 'http'
import { parseBody, writeBody } from './utils/getBody'
import { Readable } from 'stream'

const DEFAULT_DELAY = 500

export class LinkMeUpError extends Error {
  constructor(message?: string) {
    super(message)
  }
}

type CreateClientOptions = {
  debug?: boolean,
  delay?: number
}

export const createPeer = (url: string, options: CreateClientOptions) => {

  let value = 0
  let status = "init"

  const delay = options.delay ?? DEFAULT_DELAY
  const request = url.startsWith("https")? httpsRequest: httpRequest
  
  const callMethod = (methodName: string, args: any[]) => new Promise<void>((res, rej) => {
    
    const payload = { args }
    const methods: Function[] = []

    const streams: Readable[] = []
    const streamRequests: ClientRequest[] = []

    const dispose = () => {
      for (let streamRequest of streamRequests) {
        if (streamRequest.closed) continue
        streamRequest.destroy()
      }
      // for (let stream of streams) {
      //   if (stream.closed) continue
      //   stream.destroy()
      // }
    }

    const reject = (error: Error) => {
      dispose()
      rej(error)
    }
    
    const onResponse = async (reply: IncomingMessage) => {
      if (reply.statusCode !== 200) {
        const body = await parseBody(reply)
        throw new Error(body?.error ?? body)
      }

      const body = await parseBody(reply)
      
      if ("_linkmeup_streams" in body) {
        for (let i = 0; i < body._linkmeup_streams.length; i++) {
          if (streamRequests[i] || !streams[i]) continue

          const streamId = body._linkmeup_streams[i]
          const newRequest = request(`${url}/_linkmeup_streams/${streamId}`, { method: "POST" })
          newRequest.on("error", () => {
            if (options.debug) {
              console.warn(`Stream ${streamId} was unexpectedly closed`)
            }
          })
          streamRequests[i] = newRequest
          streams[i].pipe(newRequest)
        }
      }

      if ("_linkmeup_methodCalls" in body) {
        for (let i = 0; i < body._linkmeup_methodCalls.length; i++) {
          const obj = body._linkmeup_methodCalls[i]
          if (obj === null) continue
          methods[i](...obj.args)
        }
      }
      
      if (body._linkmeup_status === "error") {
        return reject(new LinkMeUpError(body._linkmeup_error ?? "Error on method invoke"))
      }

      if (body._linkmeup_status === "complete") {
        dispose()
        return res(body._linkmeup_result)
      }
      
      const requestId = body["_linkmeup_id"]
      setTimeout(() => {
        const newRequest = request(`${url}/_linkmeup_status/${requestId}`, { method: "GET" }, onResponse)
        newRequest.on("error", reject)
        newRequest.end()
      }, delay)
    }

    const clientRequest = request(`${url}/${methodName}`, { method: "POST" }, onResponse)
    clientRequest.on("error", reject)
    writeBody(clientRequest, payload, streams, methods)
  })

  const setStatus = (newStatus: string) => {
    if (options.debug && status !== newStatus) {
      console.info(`Peer ${url} ${newStatus}`)
    }
    status = newStatus
  }

  const ping = async (debug = false) => {
    const onResponse = async (msg: IncomingMessage) => {
      const body = await parseBody(msg)
      setStatus("ready")
      value = body.value
    }
    const onReject = (err: any) => {
      setStatus("not-available")
    }
    const clientRequest = request(`${url}`, { method: "GET" }, onResponse)
    clientRequest.on("error", onReject)
    clientRequest.end()
    clientRequest.setTimeout(2000)
  }

  return {
    callMethod,
    ping,
    getValue: () => value,
    getStatus: () => status
  }
}

export const createClient = (url: string | string[], options: CreateClientOptions = {}) => {

  const urls = Array.isArray(url)? url: [ url ]

  const peers = urls.map(url => createPeer(url, options))

  const getActivePeer = async () => {
    let activePeers = peers.filter(item => item.getStatus() === "ready")
    const time = Date.now()
    while (activePeers.length === 0 && Date.now() - time < 1000) {
      await new Promise(res => setTimeout(res, 50))
      activePeers = peers.filter(item => item.getStatus() === "ready")
    }
    if (activePeers.length === 0) throw new Error("No available peers to connect")

    return activePeers.reduce((a, b) => a.getValue() > b.getValue()? a: b)
  }

  const callMethod = async (methodName: string, args: any[]) => {
    const peer = await getActivePeer()
    const resp = await peer.callMethod(methodName, args)
    return resp
  }

  const ping = () => {
    for (let peer of peers) {
      peer.ping(options.debug)
    }
  }
  ping()
  setInterval(ping, 5000)

  return new Proxy({}, {
    get(target, name: string) {
      return (...args: any) => callMethod(name, args)
    }
  }) as any
}