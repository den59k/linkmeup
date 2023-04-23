import https from 'http'
import { IncomingMessage } from 'http'
import { parseMessage, writeMessage } from './parseMessage'

export interface Clients {

}

const pass = () => {}

export const getClient = <K extends Clients, TYPE extends keyof K>(moduleName: TYPE, url: string): K[TYPE] => {

  return new Proxy({}, {
    get(target, name: string) {
      let delay = 500

      return (...args: any) => new Promise<void>((res, rej) => {
        const { body, headers, functions } = writeMessage(args)

        const onResponse = async (req: IncomingMessage) => {
          const buffers = [];
          for await (const chunk of req) {
            buffers.push(chunk);
          }
          const data = Buffer.concat(buffers)
          const args = parseMessage(data, req.headers, pass)
          if (typeof args === "object" && args) {

            if (args["_linkmeup_status"] === "error") {
              rej(new Error(args["_linkmeup_error"]))
              return
            }

            if (args["_linkmeup_delay"]) {
              delay = args["_linkmeup_delay"]
            }

            if (args["_linkmeup_callbacks"]) {
              for (let callback of args["_linkmeup_callbacks"]) {
                const call = functions.find(item => item.id === callback._linkmeup_id)
                if (!call) return
                call.callback(...callback._linkmeup_args)
              }
            }

            if (args["_linkmeup_status"] === "progress") {
              const id = args["_linkmeup_id"]
              setTimeout(() => {
                const newRequest = https.get(`${url}/_linkmeup_status/${id}`, {}, onResponse)
                newRequest.on("error", rej)
              }, delay)
              return
            }

            if (args["_linkmeup_status"] === "success") {
              res()
              return
            }
          }

          res(args)
        }

        const clientRequest = https.request(`${url}/${name}`, { method: "POST", headers }, onResponse)
        clientRequest.on("error", rej)

        clientRequest.write(body)
        clientRequest.end()
      })
    }
  }) as any
}
