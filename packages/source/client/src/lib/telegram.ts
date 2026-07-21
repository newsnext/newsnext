import type { Cheerio, CheerioAPI } from "cheerio/slim"
import type { AnyNode } from "domhandler"
import { $param } from "@newsnext/source-shared/utils/params"
import { $radar, pageTitle, path } from "@newsnext/source-shared/utils/radar"
import { $provider, $source } from "@newsnext/source-shared/utils/source"

const DEFAULT_CHANNEL = "TestFlightCN"
const TELEGRAM_CHANNEL_PATTERN = /^(?![\d_])\w{5,32}$/
const TITLE_MAX_LENGTH = 160

function getTelegramMessageText(element: Cheerio<AnyNode>): string {
  const message = element.clone()
  message.find("br").replaceWith("\n")

  return message.text()
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .join("\n\n")
}

export function getTelegramMessageTitle(element: Cheerio<AnyNode>): string | undefined {
  const text = getTelegramMessageText(element)
  if (!text) return undefined

  const [firstLine] = text.split("\n")
  if (firstLine.length <= TITLE_MAX_LENGTH) return firstLine

  return `${firstLine.slice(0, TITLE_MAX_LENGTH - 1).trimEnd()}…`
}

export function getTelegramMessagePreview(element: Cheerio<AnyNode>): string | undefined {
  return getTelegramMessageText(element) || undefined
}

export function getTelegramMessagePicture(element: Cheerio<AnyNode>): { src: string } | undefined {
  const style = element.attr("style")
  const src = style?.match(/background-image\s*:\s*url\((['"]?)(.*?)\1\)/)?.[2]

  return src ? { src } : undefined
}

function getTelegramMessageItems($: CheerioAPI): AnyNode[] {
  return $(".tgme_widget_message")
    .filter((_, element) => $(element).find(".tgme_widget_message_text").length > 0)
    .toArray()
}

export default $provider({
  title: "Telegram",
  color: "blue",
  home: `https://t.me/s/${DEFAULT_CHANNEL}`,
  category: "tech",
  sources: [
    $source.html(
      {
        key: "channel",
        title: "科技圈 在花频道",
        type: "timeline",
        radar: [
          $radar({
            id: "telegram-channel",
            hosts: ["t.me", "telegram.me"],
            paths: ["/s/:channel", "/:channel"],
            params: {
              channel: path("channel"),
            },
            meta: {
              title: pageTitle()
                .normalize()
                .replace("\\s*[–-]\\s*Telegram$", "")
                .fallback("Telegram channel"),
              home: path("channel").template("https://t.me/s/{value}"),
            },
            confidence: 0.95,
          }),
        ],
        params: {
          channel: $param.text({
            default: DEFAULT_CHANNEL,
            title: "Channel",
            pattern: TELEGRAM_CHANNEL_PATTERN.source,
            parse: value => String(value).trim().replace(/^@/, ""),
            validate: value => TELEGRAM_CHANNEL_PATTERN.test(value)
              || "Channel must be a valid Telegram username",
          }),
        },
      },
      ({ channel }) => ({
        url: `https://t.me/s/${channel}`,
        items: getTelegramMessageItems,
        fields: {
          title: {
            selector: ".tgme_widget_message_text",
            transform: (_value, element) => getTelegramMessageTitle(element),
          },
          url: {
            selector: ".tgme_widget_message_date",
            attr: "href",
          },
          timestamp: {
            selector: ".tgme_widget_message_date time",
            attr: "datetime",
            transform: value => value ? Date.parse(value) : undefined,
          },
          inline: {
            text: {
              selector: ".tgme_widget_message_views",
              transform: value => value ? `${value} views` : undefined,
            },
          },
          preview: {
            text: {
              selector: ".tgme_widget_message_text",
              transform: (_value, element) => getTelegramMessagePreview(element),
            },
            picture: {
              selector: ".tgme_widget_message_photo_wrap, .tgme_widget_message_video_thumb",
              transform: (_value, element) => getTelegramMessagePicture(element.first()),
            },
          },
        },
      }),
    ),
  ],
})
