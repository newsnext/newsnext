import { defineContentScript } from "#imports"

export default defineContentScript({
  matches: ["*://*.google.com/*"],
  main() {
    console.log("Hello content.")
  },
})
