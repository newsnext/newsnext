import { createSvgIllustrationDataUrl } from "./config"

const SVG_MIME_TYPE = "image/svg+xml"
const UNSAFE_SVG_ELEMENTS = new Set([
  "audio",
  "embed",
  "foreignobject",
  "iframe",
  "image",
  "object",
  "script",
  "video",
])
const CSS_URL_PATTERN = /url\(([^)]*)\)/gi

export function isSvgIllustrationFile(file: File): boolean {
  return file.type.toLowerCase() === SVG_MIME_TYPE || file.name.toLowerCase().endsWith(".svg")
}

export async function createBgIllustrationFromSvg(file: File): Promise<string> {
  const source = await file.text()
  const document = new DOMParser().parseFromString(source, SVG_MIME_TYPE)
  const root = document.documentElement

  if (document.querySelector("parsererror")
    || root.localName.toLowerCase() !== "svg"
    || root.namespaceURI !== "http://www.w3.org/2000/svg") {
    throw new Error("Choose a valid SVG file.")
  }

  sanitizeSvg(root)
  const serialized = new XMLSerializer().serializeToString(root)
  const illustration = createSvgIllustrationDataUrl(serialized)
  if (!illustration) {
    throw new Error("The SVG is too large to use as background illustration.")
  }
  return illustration
}

function sanitizeSvg(root: Element): void {
  for (const element of [root, ...root.querySelectorAll("*")]) {
    if (UNSAFE_SVG_ELEMENTS.has(element.localName.toLowerCase())) {
      element.remove()
      continue
    }

    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.localName.toLowerCase()
      const value = attribute.value.trim()
      if (name.startsWith("on")
        || ((name === "href" || name === "src") && value !== "" && !value.startsWith("#"))
        || hasExternalCssResource(value)) {
        element.removeAttributeNode(attribute)
      }
    }

    if (element.localName.toLowerCase() === "style" && hasExternalCssResource(element.textContent ?? "")) {
      element.remove()
    }
  }
}

function hasExternalCssResource(value: string): boolean {
  if (/@font-face|@import/i.test(value)) return true
  for (const match of value.matchAll(CSS_URL_PATTERN)) {
    let resource = match[1]?.trim() ?? ""
    if ((resource.startsWith("\"") && resource.endsWith("\""))
      || (resource.startsWith("'") && resource.endsWith("'"))) {
      resource = resource.slice(1, -1).trim()
    }
    if (!resource.startsWith("#")) return true
  }
  return false
}
