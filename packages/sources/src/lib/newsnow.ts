import { Time } from "../typings/constants"
import { defineSelectParameter } from "../utils/params"
import { defineHtmlSourceFetcher, defineSource } from "../utils/source"

export default defineSource({
  name: "NEWS NOW",
  interval: Time.Test,
  type: "timeline",
  category: "world",
  color: "red",
  home: "https://www.newsnow.com",
  ...defineHtmlSourceFetcher({
    locale: defineSelectParameter<"us" | "uk" | "ng" | "ro" | "it" | "ca" | "au">({
      options: [
        { label: "US", value: "us" },
        { label: "UK", value: "uk" },
        { label: "Nigeria", value: "ng" },
        { label: "România", value: "ro" },
        { label: "Italia", value: "it" },
        { label: "Canada", value: "ca" },
        { label: "Australia", value: "au" },
      ],
      default: "us",
      title: "Locale",
    }),
    topic: {
      type: "text",
      default: "US",
      title: "Topic",
    },
  }, ({ locale, topic }) => ({
    url: `https://www.newsnow.com/${locale}/${topic}?type=ln`,
    itemSelector: ".newsfeed .article",
    fields: {
      title: ".article-card__headline",
      url: { selector: ".article-card__headline", attr: "href" },
      timestamp: {
        selector: "[data-timestamp]",
        attr: "data-timestamp",
        transform: val => Number(val) * 1000,
      },
      info: {
        text: ".article-publisher__name",
      },
    },
  })),
})
