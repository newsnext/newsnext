import type { AdaptiveCacheState } from "@newsnext/cache-policy"
import type { CacheAdapter, CacheEntry } from "../typings"
import { Db0CacheStorage } from "@newsnext/database/cache/db0"

export class Db0CacheAdapter implements CacheAdapter {
  private readonly storage: CacheAdapter

  constructor(storage: CacheAdapter) {
    this.storage = storage
  }

  static async fromDb0(db0: unknown): Promise<Db0CacheAdapter> {
    return new Db0CacheAdapter(await Db0CacheStorage.fromDb0(db0 as never))
  }

  get<T>(key: string): Promise<CacheEntry<T> | undefined> {
    return this.storage.get(key)
  }

  set<T>(key: string, value: T): Promise<void> {
    return this.storage.set(key, value)
  }

  getPolicy(key: string): Promise<AdaptiveCacheState | undefined> {
    return this.storage.getPolicy(key)
  }

  setPolicy(key: string, value: AdaptiveCacheState): Promise<void> {
    return this.storage.setPolicy(key, value)
  }
}
