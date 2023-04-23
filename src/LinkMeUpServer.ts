import http from 'http'
import { nanoid, parseMessage, writeMessage } from './parseMessage'

type AddMethodOptions = {
  delay?: number
}

type Event = {
  event: (...args: any) => any | Promise<any>,
  type: "simple" | "long"
  options: AddMethodOptions
}

export class LinkMeUpServer {
  private events = new Map<string, Event>()
  constructor() {
    
  }
  
  addMethod(channel: string, event: (...args: any) => Promise<any>, options: AddMethodOptions = {}) {
    this.events.set(channel, { event, options, type: "simple" })
  }

  addLongMethod(channel: string, event: (...args: any) => Promise<any>, options: AddMethodOptions = {}) {
    this.events.set(channel, { event, options, type: "long" })
  }

  private server = http.createServer(async (req, res) => {
    console.log(req.url)

    if (!req.url || req.url === "/") {
      res.writeHead(200)
      res.end('{"status":"up"}')
      return
    }

    if (req.url.startsWith("/_linkmeup_status")) {
      const requestId = req.url.slice("/_linkmeup_status/".length)
      const callbacks = this.callbackCache.get(requestId)

      if (this.resultsCache.has(requestId)) {
        const result = this.resultsCache.get(requestId)
        const { body, headers } = writeMessage(result)
        for (let [key, value] of Object.entries(headers)) {
          res.setHeader(key, value)
        }
        res.writeHead(200)
        this.resultsCache.delete(requestId)
        this.callbackCache.delete(requestId)

        if (result) {
          res.end(body)
        } else {
          res.end(JSON.stringify({ _linkmeup_status: "success", _linkmeup_callbacks: callbacks }))
        }
        return
      }
      if (!callbacks) {
        res.writeHead(404)
        res.end(JSON.stringify({ error: "requestId not found" }))
        return
      }
      res.writeHead(200)
      res.end(JSON.stringify({ 
        _linkmeup_status: "progress",
        _linkmeup_id: requestId, 
        _linkmeup_callbacks: callbacks
      }))
      return
    }
    
    const methodName = req.url.slice(1)
    const event = this.events.get(methodName)

    if (!event) {
      res.writeHead(404)
      res.end(`{"error":"Method "${methodName}" not found"}`)
      return
    }

    try {
      const buffers = [];
      for await (const chunk of req) {
        buffers.push(chunk);
      }
      const data = Buffer.concat(buffers)

      const requestId = nanoid()
      const args = parseMessage(data, req.headers, this.handleCallback.bind(this, requestId))

      if (event.type === "simple") {
        const resp = await event.event(...args)
        const { body, headers } = writeMessage(resp)
        for (let [key, value] of Object.entries(headers)) {
          res.setHeader(key, value)
        }
        res.writeHead(200)
        if (resp) {
          res.end(body)
        } else {
          res.end(JSON.stringify({ _linkmeup_status: "success" }))
        }
      }

      if (event.type === "long") {
        this.callbackCache.set(requestId, [])
        event.event(...args)
          .then((resp: any) => this.resultsCache.set(requestId, resp))
          .catch((e: any) => {
            this.resultsCache.set(requestId, { _linkmeup_status: "error", _linkmeup_error: e.message })
          })

        res.writeHead(200)
        res.end(JSON.stringify({ 
          _linkmeup_status: "progress", 
          _linkmeup_id: requestId, 
          _linkmeup_delay: event.options.delay ?? 500
        }))
      }
      
    } catch(e: any) {
      console.log(e)
      res.writeHead(200)
      res.end(JSON.stringify({ _linkmeup_status: "error", _linkmeup_error: e.message }))
      return
    }
  })

  private callbackCache = new Map<string, Array<{ _linkmeup_id: string, _linkmeup_args: any[] }>>()
  private resultsCache = new Map<string, any>()
  private handleCallback(requestId: string, _linkmeup_id: string, _linkmeup_args: any) {
    let arr = this.callbackCache.get(requestId)
    if (!arr) return
    for (let i = 0; i < arr.length; i++){
      if (arr[i]._linkmeup_id === _linkmeup_id) {
        arr[i] = { _linkmeup_id, _linkmeup_args }
        return
      }
    }
    arr.push({ _linkmeup_id, _linkmeup_args })
  }
  
  async listen(port: number, host: string) {
    await new Promise<void>(res => this.server.listen(port, host, res))
    console.log(`Server is running on http://${host}:${port}`)
  }

}