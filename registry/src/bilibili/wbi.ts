import type { SourceLoaderContext } from "@newsnext/source-kit/types"
import { md5 } from "@newsnext/source-kit/utils"

const WBI_NAV_URL = "https://api.bilibili.com/x/web-interface/nav"
const WBI_MIXIN_KEY_ENC_TAB = [
  46,
  47,
  18,
  2,
  53,
  8,
  23,
  32,
  15,
  50,
  10,
  31,
  58,
  3,
  45,
  35,
  27,
  43,
  5,
  49,
  33,
  9,
  42,
  19,
  29,
  28,
  14,
  39,
  12,
  38,
  41,
  13,
  37,
  48,
  7,
  16,
  24,
  55,
  40,
  61,
  26,
  17,
  0,
  1,
  60,
  51,
  30,
  4,
  22,
  25,
  54,
  21,
  56,
  59,
  6,
  63,
  57,
  62,
  11,
  36,
  20,
  34,
  44,
  52,
] as const

interface BilibiliWbiNavResponse {
  code: number
  data?: {
    wbi_img?: {
      img_url?: string
      sub_url?: string
    }
  }
  message?: string
}

interface BilibiliWbiKeys {
  imgUrl: string
  subUrl: string
}

function getWbiKeyPart(url: string): string {
  const pathname = new URL(url).pathname
  return pathname.slice(pathname.lastIndexOf("/") + 1, pathname.lastIndexOf("."))
}

export async function getBilibiliWbiKeys(context: SourceLoaderContext): Promise<BilibiliWbiKeys> {
  const response = await context.fetch.get(WBI_NAV_URL).json<BilibiliWbiNavResponse>()
  if (response.code !== 0 && response.code !== -101) {
    throw new Error(response.message ?? "Failed to load Bilibili WBI keys.")
  }
  const imgUrl = response.data?.wbi_img?.img_url
  const subUrl = response.data?.wbi_img?.sub_url
  if (!imgUrl || !subUrl) throw new Error("Bilibili did not return WBI keys.")
  return { imgUrl, subUrl }
}

export async function signBilibiliWbiParams(
  params: Record<string, number | string>,
  imgUrl: string,
  subUrl: string,
  timestamp = Math.floor(Date.now() / 1000),
): Promise<string> {
  const sourceKey = getWbiKeyPart(imgUrl) + getWbiKeyPart(subUrl)
  const mixinKey = WBI_MIXIN_KEY_ENC_TAB.map(index => sourceKey[index]).join("").slice(0, 32)
  const query = Object.entries({ ...params, wts: timestamp })
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value).replace(/[!'()*]/g, ""))}`)
    .join("&")
  return `${query}&w_rid=${await md5(query + mixinKey)}`
}
