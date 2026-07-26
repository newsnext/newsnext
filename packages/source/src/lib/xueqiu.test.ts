import type { ProviderConfig } from "../utils/source"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { myFetch } from "../utils/fetch"
import { resolveProvider } from "../utils/source"
import xueqiu from "./xueqiu.json" with { type: "json" }

vi.mock("../utils/fetch", () => ({
  myFetch: vi.fn(),
}))

describe("xueqiu source", () => {
  beforeEach(() => {
    vi.mocked(myFetch).mockReset()
  })

  it("keeps non-ad items when the API uses numeric flags", async () => {
    vi.mocked(myFetch).mockResolvedValue({
      data: {
        items: [
          {
            ad: 0,
            code: "SH688825",
            exchange: "SH",
            name: "ChangXin Technology",
            percent: null,
          },
          {
            ad: 1,
            code: "AD",
            exchange: "SH",
            name: "Advertisement",
            percent: 1,
          },
        ],
      },
    })

    const source = resolveProvider("xueqiu", xueqiu as ProviderConfig).sources["hot-stock"]
    const items = await source.loader({})

    expect(items).toEqual([
      {
        title: "ChangXin Technology",
        url: "https://xueqiu.com/s/SH688825",
        inline: {
          html: "<span style=\"color: #64748b\">--</span> <span>SH</span>",
        },
      },
    ])
  })
})
