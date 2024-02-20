import { it, expect } from "vitest"
import { traverseObj, inverseObj } from "../src/utils/getBody"

it("traverse obj", async () => {

  const obj = traverseObj({ "status": "test" }, [], [])
  expect(obj).toEqual({ "status": "test" })

  const obj2 = inverseObj({ "status": "test" }, [], [])
  expect(obj2).toEqual({ "status": "test" })

  const buffers = []
  const objWithBuffer = traverseObj({ "status": "test", "buffer": Buffer.alloc(4) }, buffers, [])
  expect(objWithBuffer).toEqual({ "status": "test", "buffer": { _linkmeup_type: "buffer", index: 0 } })
  expect(buffers.length).toBe(1)

  const resp = inverseObj(objWithBuffer, buffers, [])
  expect(resp["status"]).toBe("test")
  expect(resp["buffer"].byteLength).toBe(4)
})

it("traverse obj with functions", async () => {

  const obj = traverseObj({ "status": "test", onProgress: () => {} }, [], [], [])
  expect(obj).toEqual({ "status": "test", onProgress: { "_linkmeup_type": "function", index: 0 } })

  const methodsCache = []
  const resp = inverseObj(obj, [], [], methodsCache)
  expect(resp["status"]).toBe("test")
  expect(typeof resp["onProgress"]).toBe("function")

  resp.onProgress(1)
  expect(methodsCache.length).toBe(1)
  expect(methodsCache[0]).toEqual({ args: [ 1 ], calls: 1 })
})