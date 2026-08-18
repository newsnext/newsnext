import { describe, expect, it } from "vitest"
import { getWeiboResponseIdentity } from "./utils"

describe("getWeiboResponseIdentity", () => {
  it("reads the signed-in user ID from the content response", () => {
    expect(getWeiboResponseIdentity(new Headers({ "x-log-uid": " 123456 " })))
      .toBe("123456")
    expect(getWeiboResponseIdentity(new Headers())).toBeUndefined()
  })
})
