import { $selectParam } from "../utils/params"
import { $provider, $source } from "../utils/source"

export default $provider({
  title: "NEWS NOW",
  color: "red",
  home: "https://www.newsnow.com",
  sources: [
    $source.html(
      {
        key: "default",
        type: "timeline",
        params: {
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
        },
      },
      ({ locale, topic }) => ({
        url: `https://www.newsnow.com/${locale}/${topic}?type=ln`,
        items: ".newsfeed .article",
        fields: {
          title: ".article-card__headline",
          url: { selector: ".article-card__headline", attr: "href" },
          timestamp: {
            selector: "[data-timestamp]",
            attr: "data-timestamp",
            transform: val => Number(val) * 1000,
          },
          inline: {
            text: ".article-publisher__name",
          },
        },
      }),
    ),
  ],
})
