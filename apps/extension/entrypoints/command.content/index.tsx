import { createIframeUi, defineContentScript } from "#imports"
import { onMessage, sendMessage } from "@/services/message"

export default defineContentScript({
  matches: ["<all_urls>"],

  main(ctx) {
    const ui = createIframeUi(ctx, {
      page: "/command-iframe.html",
      position: "inline",
      anchor: "body",
      onMount: (_wrapper, iframe) => {
        iframe.style.width = "100vw"
        iframe.style.height = "100vh"
        iframe.style.position = "fixed"
        iframe.style.zIndex = "1000"
        iframe.style.top = "0"
        iframe.style.left = "0"
        iframe.style.border = "none"
        iframe.style.display = "none"
        iframe.style.colorScheme = "none"
      },
    })

    ui.mount()
    onMessage("command-bar-toggle", (e) => {
      if (e.data.status === false) {
        ui.iframe.style.display = "none"
      } else {
        if (ui.iframe.style.display === "none") {
          ui.iframe.style.display = "block"
          setTimeout(() => {
            sendMessage("command-bar-show", undefined)
          }, 500)
        } else {
          ui.iframe.style.display = "none"
        }
      }
    })
  },
})
