import type { SourceRegistryConfig } from "../utils/source"
import jsonSources from "@newsnext/registry" with { type: "json" }
import { beforeEach, describe, expect, it, vi } from "vitest"
import { myFetch } from "../utils/fetch"
import { resolveRegistrySource } from "../utils/source"

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

    const source = resolveRegistrySource(
      "xueqiu:hot-stock",
      jsonSources["xueqiu:hot-stock"] as SourceRegistryConfig,
    )
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
