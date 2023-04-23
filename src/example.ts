import { LinkMeUpServer } from './LinkMeUpServer'
import fs from 'fs'

const server = new LinkMeUpServer()

server.addMethod("processImage", async (image: Buffer) => {
  await new Promise(res => setTimeout(res, 500))
  
  await fs.promises.writeFile(process.cwd()+"/image.jpg", image)

  return `Hello world. Image size: ${image.byteLength}`
})

server.addLongMethod("processImageLong", async (image: Buffer, callback: (progress: number) => void) => {
  let count = 0
  const interval = setInterval(() => {
    count += 5
    callback(count)
  }, 50)

  throw new Error("Simple error")

  await new Promise(res => setTimeout(res, 1000))

  clearInterval(interval)

  return image
  // return "Complete! Image size: ${image.byteLength}"
})

server.listen(7800, 'localhost')
