import { Readable } from "stream"
import { createServer } from "../../src/server"

/** Server for process video */
const server = createServer("testServer")

server.addMethod("sum", async (a: number, b: number) => {
  return a + b 
})

/** 
 * Print size of file 
 * @param image - source file
 * @return fileSize in bytes
 * */
server.addLongMethod("fileSize", async (image: Buffer) => {
  return image.byteLength
})

/** Print hello world */
server.addLongMethod("helloWorld", async (image: Buffer) => {
  return "Hello World!"
})

server.addLongMethod("getStreamSize", async (sourceStream: Readable) => {
  const chunks: Buffer[] = []
  for await (const chunk of sourceStream) {
    chunks.push(chunk)
  }
  const resp = Buffer.concat(chunks).byteLength
  return resp
})