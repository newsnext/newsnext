const MAX_NATIVE_CHUNK_COUNT = 256
const MAX_REASSEMBLED_NATIVE_MESSAGE_CHARS = 64 * 1024 * 1024

interface NativeChunkTransfer {
  chunks: Array<string | undefined>
  receivedChars: number
  timeoutId: ReturnType<typeof setTimeout>
  total: number
}

type ChunkAssemblyResult
  = | { complete: false }
    | { complete: true, value: unknown }

export class NativeMessageChunkAssembler {
  readonly #timeoutMs: number
  readonly #transfers = new Map<string, NativeChunkTransfer>()

  constructor(timeoutMs: number) {
    this.#timeoutMs = timeoutMs
  }

  accept(value: unknown): ChunkAssemblyResult {
    if (!isRecord(value) || value.type !== "chunk") {
      return { complete: true, value }
    }
    const { data, index, total, transferId } = value
    if (typeof transferId !== "string"
      || !transferId
      || typeof index !== "number"
      || !Number.isSafeInteger(index)
      || index < 0
      || typeof total !== "number"
      || !Number.isSafeInteger(total)
      || total < 1
      || total > MAX_NATIVE_CHUNK_COUNT
      || index >= total
      || typeof data !== "string") {
      throw new Error("The native host returned an invalid message chunk")
    }
    let transfer = this.#transfers.get(transferId)
    if (!transfer) {
      transfer = {
        chunks: Array.from<string | undefined>({ length: total }),
        receivedChars: 0,
        timeoutId: setTimeout(() => {
          this.#transfers.delete(transferId)
        }, this.#timeoutMs),
        total,
      }
      this.#transfers.set(transferId, transfer)
    }
    if (transfer.total !== total || transfer.chunks[index] !== undefined) {
      throw new Error("The native host returned inconsistent message chunks")
    }
    transfer.chunks[index] = data
    transfer.receivedChars += data.length
    if (transfer.receivedChars > MAX_REASSEMBLED_NATIVE_MESSAGE_CHARS) {
      this.#discard(transferId, transfer)
      throw new Error("The native host message chunks exceed the size limit")
    }
    if (transfer.chunks.includes(undefined)) return { complete: false }
    this.#discard(transferId, transfer)
    const assembled: unknown = JSON.parse(transfer.chunks.join(""))
    if (isRecord(assembled) && assembled.type === "chunk") {
      throw new Error("The native host returned a nested message chunk")
    }
    return { complete: true, value: assembled }
  }

  clear(): void {
    for (const transfer of this.#transfers.values()) {
      clearTimeout(transfer.timeoutId)
    }
    this.#transfers.clear()
  }

  #discard(transferId: string, transfer: NativeChunkTransfer): void {
    clearTimeout(transfer.timeoutId)
    this.#transfers.delete(transferId)
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}
