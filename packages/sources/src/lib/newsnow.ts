import { Time } from "../typings/constants"
import { $source, $htmlSourceLoader, $provider } from "../utils/source"
import { $selectParam } from "../utils/params"

export default $provider({
  name: "NEWS NOW",
  category: "world",
  color: "red",
  home: "https://www.newsnow.com",
  sources: {
    default: $source({
      interval: Time.Test,
      type: "timeline",
      ...$htmlSourceLoader({
        locale: $selectParam<"us" | "uk" | "ng" | "ro" | "it" | "ca" | "au">({
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
        itemSelector: ".newssource .article",
        fields: {
          title: ".article-card__headline",
          url: { selector: ".article-card__headline", attr: "href" },
          timestamp: {
            selector: "[data-timestamp]",
            attr: "data-timestamp",
            transform: val => Number(val) * 1000,
          },
          meta: {
            text: ".article-publisher__name",
          },
        },
      })),
    }),
  },
})
