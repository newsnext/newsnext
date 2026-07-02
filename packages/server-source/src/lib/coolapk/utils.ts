import { encodeBase64 } from "../../utils/base64"
import { md5 } from "../../utils/crypto"

function getRandomDeviceId(): string {
  const lengths = [10, 6, 6, 6, 14]
  return lengths
    .map(length => Math.random().toString(36).substring(2, length))
    .join("-")
}

async function getAppToken(): Promise<string> {
  const deviceId = getRandomDeviceId()
  const now = Math.round(Date.now() / 1000)
  const hexNow = `0x${now.toString(16)}`
  const md5Now = await md5(now.toString())
  const tokenInput = `token://com.coolapk.market/c67ef5943784d09750dcfbb31020f0ab?${md5Now}$${deviceId}&com.coolapk.market`
  const tokenHash = await md5(encodeBase64(tokenInput))
  return tokenHash + deviceId + hexNow
}

export async function genHeaders(): Promise<Record<string, string>> {
  return {
    "X-Requested-With": "XMLHttpRequest",
    "X-App-Id": "com.coolapk.market",
    "X-App-Token": await getAppToken(),
    "X-Sdk-Int": "29",
    "X-Sdk-Locale": "zh-CN",
    "X-App-Version": "11.0",
    "X-Api-Version": "11",
    "X-App-Code": "2101202",
    "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 10; Redmi K30 5G MIUI/V12.0.3.0.QGICMXM) (#Build; Redmi; Redmi K30 5G; QKQ1.191222.002 test-keys; 10) +CoolMarket/11.0-2101202",
  }
}
