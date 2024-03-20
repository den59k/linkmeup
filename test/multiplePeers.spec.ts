import { expect, it, vi } from 'vitest'
import { createServer } from '../src/server';
import { createClient } from '../src/client';

vi.mock("http", async () => {
  const { createMockedServer, mockRequest } = await import("./httpMock");
  const actual = await vi.importActual("http")
  return {
    ...actual,
    createServer: createMockedServer,
    request: mockRequest
  }
})

it("connect to multiple peers", async () => {

  const server = createServer({ value: 10 })
  const server2 = createServer({ value: 12 })   // The higher the value, the more load the server can handle

  server.addLongMethod("getClientIdx", async () => {
    await new Promise(res => setTimeout(res, 50))
    return 1
  })
  server2.addLongMethod("getClientIdx", async () => {
    await new Promise(res => setTimeout(res, 50))
    return 2
  })

  server.listen(3001, "127.0.0.1")
  server2.listen(3002, "127.0.0.1")

  const client = createClient(["http://127.0.0.1:3001", "http://127.0.0.1:3002"], { delay: 20, pingInterval: 2 })

  expect(await client.getClientIdx()).toBe(2)

  const promises: Promise<number>[] = []

  for (let i = 0; i < 5; i++) {
    promises.push(client.getClientIdx())
    await new Promise(res => setTimeout(res, 10))
  }

  const resp = await Promise.all(promises)
  expect(resp.includes(1)).toBeTruthy()
  expect(resp.includes(2)).toBeTruthy()
})