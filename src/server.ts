import { createServer as createHttpServer } from 'http'
import { parseBody, writeBody } from './utils/getBody'
import { uid } from './utils/uid'
import { Transform } from 'stream'

type AddMethodOptions = {
  delay?: number
}

type Event = {
  event: (...args: any) => Promise<any>,
  type: "simple" | "long",
  options: AddMethodOptions
}

type LinkMeUpObject = {
  _linkmeup_id: string, 
  _linkmeup_status: "process" | "error" | "complete", 
  _linkmeup_methodCalls: any[],
  _linkmeup_streams: string[],
  _linkmeup_startTime: number,
  _linkmeup_endTime?: number,
  _linkmeup_error?: string,
  _linkmeup_result?: any
}

export const createServer = () => {
  
  const maxValue = 10
  let activeJobs = 0

  const events = new Map<string, Event>()

  const methodsCacheMap = new Map<string, LinkMeUpObject>()
  const streamsMap = new Map<string, Transform>()

  const server = createHttpServer(async (req, res) => {
    if (!req.url || req.url === "/") {
      await new Promise<void>(res => setTimeout(res, 20))
      return res
        .setHeader("content-type", "application/json")
        .writeHead(200)
        .end(JSON.stringify({ status: "up", activeJobs, value: maxValue - activeJobs }))
    }

    if (req.url.startsWith("/_linkmeup_status")) {
      const requestId = req.url.slice("/_linkmeup_status/".length)
      const cacheObj = methodsCacheMap.get(requestId)
      if (!cacheObj) {
        return res.setHeader("content-type", "text/plain").writeHead(404).end("Endpoint not found")
      }

      writeBody(res, cacheObj)
      cacheObj._linkmeup_methodCalls.length = 0
      return
    }

    if (req.url.startsWith("/_linkmeup_streams")) {
      const streamId = req.url.slice("/_linkmeup_streams/".length)
      const stream = streamsMap.get(streamId)
      if (!stream) {
        return res.setHeader("content-type", "text/plain").writeHead(404).end("Stream not found")
      }

      req.pipe(stream)
      return
    }

    const methodName = req.url.slice(1)
    const event = events.get(methodName)

    if (!event) {
      return res
        .setHeader("content-type", "application/json")
        .writeHead(404)
        .end(JSON.stringify({ error: `Method "${methodName}" not found` }))
    }

    if (event.type === "simple") {
      try {
        activeJobs++

        const body = await parseBody(req)
        const resp = await event.event(...body.args)
        const response = { _linkmeup_status: "complete", _linkmeup_result: resp }
        writeBody(res, response)
      } catch(err: any) {
        // console.warn(err)
        const response = { _linkmeup_status: "error", _linkmeup_error: err.message, _linkmeup_result: null }
        writeBody(res, response)
      } finally {
        activeJobs--
      }
    }

    if (event.type === "long") {
      const processId = uid()
      
      const cacheObj: LinkMeUpObject = { 
        _linkmeup_id: processId,
        _linkmeup_status: "process", 
        _linkmeup_methodCalls: [],
        _linkmeup_streams: [],
        _linkmeup_startTime: Date.now()
      }
      const streams: Transform[] = []
      methodsCacheMap.set(processId, cacheObj)
      const body = await parseBody(req, streams, cacheObj._linkmeup_methodCalls)

      for (let stream of streams) {
        const id = uid()
        streamsMap.set(id, stream)
        cacheObj._linkmeup_streams.push(id)
      }

      activeJobs++
      event.event(...body.args)
        .then((resp) => {
          cacheObj._linkmeup_result = resp
          cacheObj._linkmeup_status = "complete"
          cacheObj._linkmeup_endTime = Date.now()
        })
        .catch((err) => {
          // console.warn(err)
          cacheObj._linkmeup_status = "error"
          cacheObj._linkmeup_error = err.message
          cacheObj._linkmeup_endTime = Date.now()
        })
        .finally(() => {
          activeJobs--
        })

      writeBody(res, cacheObj)
    }
  })

  const closeStream = (streamId: string) => {
    const stream = streamsMap.get(streamId)
    if (!stream) return
    if (!stream.closed) {
      stream.destroy()
    }
    streamsMap.delete(streamId)
    // console.info(`Remove stream ${streamId}`)
  }
  
  const checkActiveJobsInterval = setInterval(() => {
    if (methodsCacheMap.size === 0) return

    const disposeTime = Date.now() - 10 * 1000
    const closeByTimeoutTime = Date.now() - 30 * 60 * 1000

    const toRemove = []
    for (let job of methodsCacheMap.values()) {
      if (job._linkmeup_endTime !== undefined && disposeTime > job._linkmeup_endTime) {
        toRemove.push(job._linkmeup_id)
        for (let streamId of job._linkmeup_streams) {
          closeStream(streamId)
        }
      }
      if (closeByTimeoutTime > job._linkmeup_startTime && job._linkmeup_endTime === undefined) {
        job._linkmeup_endTime = Date.now()
        job._linkmeup_error = "Job Timeout"
        job._linkmeup_status = "error"
      }
    }

    for (let id of toRemove) {
      // console.info(`Remove job ${id}`)
      methodsCacheMap.delete(id)
    }
  }, 5000)

  const listen = async (port: number, hostname: string) => {
    await new Promise<void>(res => server.listen(port, hostname, res))
  }
  
  const addMethod = (channel: string, event: (...args: any) => Promise<any>, options: AddMethodOptions = {}) => {
    events.set(channel, { event, options, type: "simple" })
  }

  const addLongMethod = (channel: string, event: (...args: any) => Promise<any>, options: AddMethodOptions = {}) => {
    events.set(channel, { event, options, type: "long" })
  }

  const dispose = () => {
    clearInterval(checkActiveJobsInterval)
    server.closeAllConnections()
    server.close()
  }

  return {
    addMethod,
    addLongMethod,
    listen,
    dispose
  }
}