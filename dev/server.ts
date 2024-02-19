import { createClient } from "../src/client";
import { createServer } from "../src/server";
import fs from 'fs'

const server = createServer()

server.addMethod("sum", async (a: number, b: number) => {
  return a + b 
})

server.addMethod("fileSize", async (image: Buffer) => {
  return image.byteLength
})

server.listen(3000, "127.0.0.1")
  .then(() => console.log("Server listen!"))

const client = createClient("http://127.0.0.1:3000", { debug: true })

const init = async () => {

  const resp = await client.sum(5, 2)
  console.log(resp)

  const file = await fs.promises.readFile(__dirname + "/test.jpg")
  const resp2 = await client.fileSize(file)
  console.log(resp2)
}

init()