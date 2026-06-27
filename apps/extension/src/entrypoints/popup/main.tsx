import React from "react"
import ReactDOM from "react-dom/client"
import { browser } from "wxt/browser"
import "./style.css"

function Popup(): React.JSX.Element {
  async function openNewTab(): Promise<void> {
    await browser.tabs.create({
      url: browser.runtime.getURL("/newtab.html"),
    })
    window.close()
  }

  return (
    <main className="popup">
      <header className="popup__header">
        <div className="popup__mark">N</div>
        <div>
          <h1>NewsNext</h1>
          <p>Browser workspace</p>
        </div>
      </header>

      <button className="popup__primary" type="button" onClick={openNewTab}>
        Open new tab
      </button>

      <p className="popup__hint">Open NewsNext in a dedicated browser tab.</p>
    </main>
  )
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
)
