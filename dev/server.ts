import { createServer } from "../src/server";

const server = createServer()

server.addMethod("sum", async (a: number, b: number) => {
  return a + b 
})

server.listen(3000, "127.0.0.1")
  .then(() => console.log("Server listen!"))

