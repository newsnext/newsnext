import type { ProviderConfig } from "@newsnext/source/utils/source"

export default {
  title: "NEWS NOW",
  color: "red",
  home: "https://www.newsnow.com",
  sources: {
    "topic-latest": {
      type: "timeline",
      params: {
        locale: {
          type: "select",
          values: [
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
        },
        topic: {
          type: "text",
          default: "US",
          title: "Topic",
        },
      },
      radar: [
        {
          id: "newsnow-topic",
          match: {
            hosts: ["newsnow.com"],
            paths: ["/:locale/*topic"],
          },
          metaPatch: {
            title: "{topic}",
          },
          confidence: 0.85,
        },
      ],
      loader: {
        type: "html",
        url: ({ locale, topic }) => `https://www.newsnow.com/${locale}/${topic}?type=ln`,
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
      },
      cache: "5m",
    },
  },
} satisfies ProviderConfig
