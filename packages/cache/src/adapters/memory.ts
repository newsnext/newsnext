import type { CacheAdapter, CacheEntry } from "../typings"

interface MemoryCacheOptions {
  maxSize?: number
}

export class MemoryCacheAdapter implements CacheAdapter {
  private cache = new Map<string, CacheEntry<any>>()
  private maxSize: number

  constructor(options: MemoryCacheOptions = {}) {
    this.maxSize = options.maxSize ?? 1000
  }

  async get<T>(key: string): Promise<CacheEntry<T> | undefined> {
    const entry = this.cache.get(key)
    if (entry) {
      // Simple LRU: re-insert to update access order (since Map keys are ordered by insertion)
      this.cache.delete(key)
      this.cache.set(key, entry)
    }
    return entry
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxSize) {
      // Remove oldest (first inserted) item
      const firstKey = this.cache.keys().next().value
      if (firstKey) this.cache.delete(firstKey)
    }

    this.cache.set(key, {
      value,
      updatedAt: Date.now(),
    })
  }
}
