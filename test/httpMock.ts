import type http from 'http'
import { MultiMap } from './utils/multimap'
import { URL } from 'url'
import { ClientRequest, IncomingMessage, ServerResponse } from 'http'
import { PassThrough } from 'stream'

const servers = new Map<string, (req: any, reply: any) => Promise<void>>()

export const createMockedServer = (handler: (req: http.IncomingMessage, reply: any) => Promise<void>) => {
  return {
    listen: (port: number, host: string, callback?: () => void) => {
      servers.set(`http://${host}:${port}`, handler)
      callback?.()
    }
  }
}

export const mockRequest = (url: string, options: http.RequestOptions, callback: (res: http.IncomingMessage) => void) => {

  const _events = new MultiMap<string, (...args: any) => void>()

  const _url = new URL(url)
  const handler = servers.get(_url.origin)
  if (!handler) {
    _events.forEach("error", callback => callback(new Error(`Host ${url} not found`)))
    return
  }
  
  const passthrough = new PassThrough()
  const req = passthrough as unknown as IncomingMessage
  const request = passthrough as unknown as ClientRequest
  req.headers = {}
  req.url = _url.pathname+_url.search
  req.method = options.method
  request.setHeader = (header, value) => {
    (req.headers as any)[header] = value
    return request
  }
  req.setTimeout = () => req

  const passthroughReply = new PassThrough()
  const reply = passthroughReply as unknown as ServerResponse
  const replyMessage = passthroughReply as unknown as IncomingMessage
  replyMessage.headers = {}
  
  reply.writeHead = (statusCode: number, headers: any) => {
    replyMessage.statusCode = statusCode
    callback?.(reply as unknown as IncomingMessage)
    return reply
  }
  reply.setHeader = (header, value) => {
    (replyMessage.headers as any)[header] = value
    return reply
  }

  handler(req, reply)

  return passthrough
}