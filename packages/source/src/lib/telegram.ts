import type { ProviderConfig } from "@newsnext/source/utils/source"

const DEFAULT_CHANNEL = "TestFlightCN"
const TELEGRAM_CHANNEL_PATTERN = /^(?![\d_])\w{5,32}$/

export default {
  title: "Telegram",
  color: "blue",
  home: `https://t.me/s/${DEFAULT_CHANNEL}`,
  category: "tech",
  sources: {
    channel: {
      title: "科技圈 在花频道",
      sourceIcon: "https://t.me/i/userpic/320/{{ params.channel | required | url_path }}.jpg",
      type: "timeline",
      params: {
        channel: {
          type: "text",
          default: DEFAULT_CHANNEL,
          title: "Channel",
          pattern: TELEGRAM_CHANNEL_PATTERN.source,
          transforms: [
            { type: "trim" },
            { type: "removePrefix", value: "@" },
          ],
        },
      },
      radar: [
        {
          id: "telegram-channel",
          match: {
            hosts: ["t.me", "telegram.me"],
            paths: ["/s/:channel", "/:channel"],
          },
          paramsPatch: {
            channel: {
              value: { type: "path", name: "channel" },
            },
          },
          metaPatch: {
            title: {
              value: { type: "pageTitle" },
              transforms: [
                { type: "normalizeWhitespace" },
                { type: "replace", pattern: "\\s*[–-]\\s*Telegram$", replacement: "" },
              ],
              fallback: "Telegram channel",
            },
            home: {
              value: { type: "path", name: "channel" },
              transforms: [
                { type: "template", value: "https://t.me/s/{{ value }}" },
              ],
            },
          },
          confidence: 0.95,
        },
      ],
      loader: {
        type: "html",
        url: "https://t.me/s/{{ params.channel | url_path }}",
        items: ".tgme_widget_message:has(.tgme_widget_message_text)",
        fields: {
          title: {
            selector: ".tgme_widget_message_text",
            brSeparator: "\n",
            template: "{{ value | first_line | truncate: 160, '…' }}",
          },
          url: {
            selector: ".tgme_widget_message_date",
            attr: "href",
            template: "{{ value | absolute_url: requestUrl }}",
          },
          timestamp: {
            selector: ".tgme_widget_message_date time",
            attr: "datetime",
            template: "{{ value | date_to_ms }}",
          },
          inline: {
            text: {
              selector: ".tgme_widget_message_views",
              template: "{% if value %}{{ value }} views{% endif %}",
            },
          },
          preview: {
            text: {
              selector: ".tgme_widget_message_text",
              brSeparator: "\n",
              template: "{{ value | normalize_lines: 2 }}",
            },
            picture: {
              selector: ".tgme_widget_message_photo_wrap, .tgme_widget_message_video_thumb",
              attr: "style",
              template: "{{ value | css_url }}",
            },
          },
        },
      },
      cache: "5m",
    },
  },
} satisfies ProviderConfig
