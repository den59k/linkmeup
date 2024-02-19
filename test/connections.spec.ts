import { expect, it, vi } from 'vitest'

vi.mock("http", async () => {
  const { createMockedServer, mockRequest } = await import("./httpMock");
  const actual = await vi.importActual("http")
  return {
    ...actual,
    createServer: createMockedServer,
    request: mockRequest
  }
})


import { createServer } from '../src/server'
import { createClient } from '../src/client';

it("test connection", async () => {
  const server = createServer()

  server.addMethod("sum", async (a: number, b: number) => {
    return a + b
  })
  await server.listen(8000, "127.0.0.1")

  const client = createClient("http://127.0.0.1:8000")
  const resp = await client.sum(1, 2)
  expect(resp).toBe(3)
})

it("test send buffer as argument", async () => {
  const server = createServer()

  server.addMethod("concat", async (a: Buffer, b: Buffer) => {
    return Buffer.concat([ a, b ])
  })
  await server.listen(8000, "127.0.0.1")

  const client = createClient("http://127.0.0.1:8000")

  const resp = await client.concat(Buffer.from("Hello, "), Buffer.from("world!"))
  expect((resp as Buffer).toString()).toBe("Hello, world!")
})

it("test long method", async () => {
  const server = createServer()

  server.addLongMethod("convert", async (a: Buffer, b: Buffer, onProgress: (progress: number) => void) => {
    for (let i = 0; i <= 100; i+= 10) {
      onProgress(i)
      await new Promise(res => setTimeout(res, 10))
    }
    return Buffer.concat([ a, b ])
  })
  await server.listen(8000, "127.0.0.1")

  const client = createClient("http://127.0.0.1:8000")

  let _progress = 0
  const resp = await client.convert(Buffer.from("Hello, "), Buffer.from("world!"), (progress: number) => {
    _progress = progress
  })
  expect((resp as Buffer).toString()).toBe("Hello, world!")
  expect(_progress).toBe(100)
})

it("test error method", async () => {

  const server = createServer()
  server.addMethod("sqrt", async (a: number) => {
    if (a < 0) {
      throw new Error("Number cant be less a zero")
    }
    return Math.sqrt(a)
  })
  await server.listen(8000, "127.0.0.1")

  const client = createClient("http://127.0.0.1:8000")

  expect(await client.sqrt(4)).toBe(2)
  await expect(() => client.sqrt(-5)).rejects.toThrowError("Number cant be less a zero")
})

it("test error long method", async () => {

  const server = createServer()
  server.addLongMethod("sqrt", async (a: number) => {
    if (a < 0) {
      throw new Error("Number cant be less a zero")
    }
    return Math.sqrt(a)
  })
  await server.listen(8000, "127.0.0.1")

  const client = createClient("http://127.0.0.1:8000")
  expect(await client.sqrt(4)).toBe(2)
  await expect(() => client.sqrt(-5)).rejects.toThrowError("Number cant be less a zero")
})