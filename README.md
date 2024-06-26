# LinkMeUp - the easiest way to link NodeJS microservices with each other

Currently the project is at the "Working prototype" stage.

## Features

* Calling remote methods

* Transfer the buffer in binary

* Calling long methods with feedback functions

* Calling methods with stream arguments 

## Install

```bash
yarn install linkmeup
```

## How to use it

First, you need two projects - root service project and microservice project. A project with a microservice will be called a **server** because it accepts requests from the root.

In microservice project create server instance, like

```ts
import { createServer } from 'linkmeup'
const server = new createServer("imageConverter")
```

Then, add some async method for your server and launch the server, like:
```ts
/** Convert image to another image */
server.addMethod("processImage", async (image: Buffer) => {
  const result = await processImage(image)
  return result
})

...

server.listen(7800, 'localhost')
```

In the second step, we need to build a file with types to send to the client. You can do this using the command line, and then modify it if necessary:

```
yarn linkmeup generate
```

This will result in the file `linkmeup.d.ts` with the following content:

```ts
declare module "linkmeup" {
    interface LinkMeUpClients {
        imageConverter: {
            /** Convert image to another image */
            processImage(image: Buffer): Promise<Buffer>;
        };
    }
}
export {}
```

This file needs to be placed in the client to pull up the right types. Usually, it is enough to place it anywhere for the typescript to pick it up.

That's it, now all that's left is to connect to our server:

```ts
import { createClient } from 'linkmeup'

const client = createClient("imageConverter", "http://localhost:7800")
```

The methods are called as usual methods with the names that were assigned on the server:
```ts
const resultImage = await client.processImage(image)
```

## How to call long methods

In the previous section, when calling methods, the usual HTTP call is used, which waits for the completion of the function. This is a simple and fast scheme, but your request may drop by timeout (e.g. it will be killed by nginx).

To avoid this, you can use long methods. In this case, a request is sent, which immediately receives a response with the requestId. Then, at a certain interval, the client asks the server about the status of the request. This also allows you to make a callback on the server.

Example: You upload a video to a microservice for compression. The video is long and takes a long time to process, in addition you would like to know what percentage of it has been processed. To do this, you declare a long method and callback every time you update your progress.

Extend last example. We use `addLongMethod` instead `addMethod`

```ts
server.addLongMethod("processVideo", async (video: Buffer, callback: (progress: number) => void) => {
  const result = await processVideo(video, (progress) => {
    callback(progress)
  })
  return result
})
```

And that's it! Also generate the `d.ts` files and move quickly to the client.

```ts

const resultVideo = await client.processVideo(video, (progress: number) => {
  console.log(`Progress: ${progress}`)
})

console.log(`Target video: ${resultVideo}`)
```