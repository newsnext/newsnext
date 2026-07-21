import type { ShadowRootContentScriptUi } from "wxt/utils/content-script-ui/shadow-root"
import { browser } from "wxt/browser"
import { createShadowRootUi, defineContentScript } from "#imports"
import {
  isCloseRadarOverlayMessage,
  isToggleRadarOverlayMessage,
} from "@/lib/radar-overlay-message"
import "@/styles/radar-overlay.css"

const RADAR_OVERLAY_PAGE = "/radar-overlay.html"

function createOverlayContent(): HTMLDialogElement {
  const backdrop = document.createElement("dialog")
  backdrop.className = "newsnext-radar-backdrop"

  const panel = document.createElement("section")
  panel.className = "newsnext-radar-panel"
  panel.setAttribute("aria-label", "NewsNext radar")

  const frame = document.createElement("iframe")
  frame.className = "newsnext-radar-frame"
  frame.src = browser.runtime.getURL(RADAR_OVERLAY_PAGE)
  frame.title = "NewsNext radar"

  panel.append(frame)
  backdrop.append(panel)
  return backdrop
}

export default defineContentScript({
  matches: ["http://*/*", "https://*/*"],
  cssInjectionMode: "ui",
  async main(ctx) {
    let isMounted = false
    let ui: ShadowRootContentScriptUi<HTMLDialogElement> | undefined

    const close = (): void => {
      if (!isMounted) {
        return
      }

      ui?.mounted?.close()
      ui?.remove()
      isMounted = false
    }

    ui = await createShadowRootUi(ctx, {
      name: "newsnext-radar-overlay",
      position: "modal",
      zIndex: 2147483647,
      isolateEvents: true,
      onMount(container) {
        const content = createOverlayContent()
        const panel = content.querySelector(".newsnext-radar-panel")

        content.addEventListener("click", close)
        content.addEventListener("cancel", (event) => {
          event.preventDefault()
          close()
        })
        panel?.addEventListener("click", event => event.stopPropagation())
        container.append(content)
        content.showModal()
        return content
      },
    })

    const toggle = (): void => {
      if (isMounted) {
        close()
        return
      }

      ui?.mount()
      isMounted = true
    }

    const handleMessage = (message: unknown): void => {
      if (isToggleRadarOverlayMessage(message)) {
        toggle()
      }
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        close()
      }
    }

    const handleWindowMessage = (event: MessageEvent<unknown>): void => {
      const frame = ui?.mounted?.querySelector<HTMLIFrameElement>(".newsnext-radar-frame")

      if (isCloseRadarOverlayMessage(event.data) && event.source === frame?.contentWindow) {
        close()
      }
    }

    browser.runtime.onMessage.addListener(handleMessage)
    document.addEventListener("keydown", handleKeyDown)
    window.addEventListener("message", handleWindowMessage)

    ctx.onInvalidated(() => {
      browser.runtime.onMessage.removeListener(handleMessage)
      document.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("message", handleWindowMessage)
    })
  },
})
