import { Readable } from "stream"
import { createServer } from "../src/server"
import { createClient } from "../src/client"
import fs from 'fs'

const server = createServer()

server.addLongMethod("fileSize", async (image: Readable) => {
  const chunks: Buffer[] = []
  const time = Date.now()
  for await (const chunk of image) {
    chunks.push(chunk)
  }
  const resp = Buffer.concat(chunks).byteLength
  console.log("Stream time:", Date.now() - time, "Chunks length:", chunks.length)
  return resp
})

server.listen(3000, "0.0.0.0").then(() => console.log("Server listen!"))

const client = createClient("http://192.168.0.11:3000", { debug: true, delay: 50 })

const init = async () => {

  const inputStream = fs.createReadStream(__dirname + "/test.jpg")
  const time = Date.now()
  const resp2 = await client.fileSize(inputStream)
  console.log(resp2)
  console.log(`Execution time: ${Date.now() - time}ms`)

  // await new Promise(res => setTimeout(res, 1000))
  // server.dispose()
}

init()