import { load } from "cheerio/slim"
import { describe, expect, it } from "vitest"
import {
  getTelegramMessagePicture,
  getTelegramMessagePreview,
  getTelegramMessageTitle,
} from "./telegram"

describe("telegram source", () => {
  it("extracts a concise title and a readable preview from message HTML", () => {
    const $ = load(`
      <div class="tgme_widget_message_text">
        <b>Telegram headline</b><br><br>
        First paragraph.<br><br>
        Second paragraph.
      </div>
    `)
    const message = $(".tgme_widget_message_text")

    expect(getTelegramMessageTitle(message)).toBe("Telegram headline")
    expect(getTelegramMessagePreview(message)).toBe(
      "Telegram headline\n\nFirst paragraph.\n\nSecond paragraph.",
    )
  })

  it("extracts media URLs from Telegram background styles", () => {
    const $ = load(`
      <a
        class="tgme_widget_message_photo_wrap"
        style="width:800px;background-image:url('https://cdn.example.com/photo.jpg')"
      ></a>
    `)

    expect(getTelegramMessagePicture($("a"))).toEqual({
      src: "https://cdn.example.com/photo.jpg",
    })
  })

  it("returns undefined for empty messages and missing media", () => {
    const $ = load("<div class=message></div>")
    const message = $(".message")

    expect(getTelegramMessageTitle(message)).toBeUndefined()
    expect(getTelegramMessagePreview(message)).toBeUndefined()
    expect(getTelegramMessagePicture(message)).toBeUndefined()
  })
})
