import { describe, expect, it } from "vitest"
import { NativeMessageChunkAssembler } from "./native-message-chunks"

describe("native message chunk assembler", () => {
  it("passes through complete messages", () => {
    const assembler = new NativeMessageChunkAssembler(1_000)
    const message = { type: "ready", protocolVersion: 15 }

    expect(assembler.accept(message)).toEqual({ complete: true, value: message })
  })

  it("reassembles out-of-order UTF-8 JSON chunks", () => {
    const assembler = new NativeMessageChunkAssembler(1_000)
    const message = { type: "ready", label: "NewsNext 新闻" }
    const serialized = JSON.stringify(message)
    const split = Math.floor(serialized.length / 2)

    expect(assembler.accept({
      type: "chunk",
      transferId: "transfer-1",
      index: 1,
      total: 2,
      data: serialized.slice(split),
    })).toEqual({ complete: false })
    expect(assembler.accept({
      type: "chunk",
      transferId: "transfer-1",
      index: 0,
      total: 2,
      data: serialized.slice(0, split),
    })).toEqual({ complete: true, value: message })
  })

  it("rejects duplicate chunks", () => {
    const assembler = new NativeMessageChunkAssembler(1_000)
    const chunk = {
      type: "chunk",
      transferId: "transfer-1",
      index: 0,
      total: 2,
      data: "{}",
    }

    expect(assembler.accept(chunk)).toEqual({ complete: false })
    expect(() => assembler.accept(chunk)).toThrow("inconsistent message chunks")
    assembler.clear()
  })
})
