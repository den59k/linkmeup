import { createClient } from "../src/client";
import { createServer } from "../src/server";
import fs from 'fs'

const server = createServer()

server.addMethod("sum", async (a: number, b: number) => {
  return a + b 
})

server.addLongMethod("fileSize", async (image: Buffer) => {
  return image.byteLength
})

server.listen(3000, "0.0.0.0").then(() => console.log("Server listen!"))

const client = createClient("http://192.168.0.11:3000", { debug: true, delay: 50 })

const init = async () => {

  // const resp = await client.sum(5, 2)
  // console.log(resp)

  const time = Date.now()
  const file = await fs.promises.readFile(__dirname + "/test.jpg")
  const resp2 = await client.fileSize(file)
  console.log(resp2)
  console.log(`Execution time: ${Date.now() - time}ms`)
}

init()