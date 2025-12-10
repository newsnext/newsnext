import fs from "node:fs"
import path from "node:path"
import { ROOT_DIR } from "../root"
import { COLORS } from "../../src/typings/constants"

const TARGET_FILE = path.resolve(ROOT_DIR, "src", "styles", "themes.css")

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]

const DEFAULT_THEME_COLOR = "red"

function generateCss() {
  let css = "@theme {\n"

  // Generate default theme (red)
  SHADES.forEach((shade) => {
    css += `    --color-theme-${shade}: var(--color-${DEFAULT_THEME_COLOR}-${shade});\n`
  })

  css += "}\n\n"
  css += "@layer theme {\n"

  // Generate other color classes
  COLORS.forEach((color) => {
    css += `  .${color} {\n`
    SHADES.forEach((shade) => {
      css += `    --color-theme-${shade}: var(--color-${color}-${shade});\n`
    })
    css += "  }\n"
  })

  css += "}\n"

  return css
}

try {
  const cssContent = generateCss()
  fs.writeFileSync(TARGET_FILE, `/* auto generated */\n\n${cssContent}`, "utf-8")
  console.log(`Successfully generated themes at: ${TARGET_FILE}`)
  console.log("--------------------------------")
  console.log(cssContent)
} catch (error) {
  console.error("Error generating themes:", error)
  process.exit(1)
}
