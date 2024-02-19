import { createClient } from '../src/client'
import fs from 'fs'

const client = createClient("http://127.0.0.1:3000")

const init = async () => {

  const resp = await client.sum(5, 2)
  console.log(resp)

  const file = await fs.promises.readFile(__dirname + "/test.webp")
  const resp2 = await client.fileSize(file)
  console.log(resp2)
}

init()