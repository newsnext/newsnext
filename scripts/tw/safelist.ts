import fs from "node:fs"
import path from "node:path"
import { ROOT_DIR } from "../../root"
import { COLORS } from "../../src/typings/constants"

const TARGET_FILE = path.resolve(ROOT_DIR, "src", "styles", "safalist.css")

function generateCss() {
  const colorsList = COLORS.join(",")
  return [
    `@source inline("bg-{${colorsList}}-400/40")`,
    `@source inline("sprinkle-{${colorsList}}-400")`,
    `@source inline("text-{${colorsList}}-400")`,
  ].join(";\n")
}

try {
  const cssContent = generateCss()
  fs.writeFileSync(TARGET_FILE, `/* auto generated */\n\n${cssContent}`, "utf-8")
  console.log(`Successfully generated safelist at: ${TARGET_FILE}`)
  console.log("--------------------------------")
  console.log(cssContent)
} catch (error) {
  console.error("Error generating safelist:", error)
  process.exit(1)
}
