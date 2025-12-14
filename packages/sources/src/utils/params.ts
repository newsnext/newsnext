import type { MultiSelectParameter, Parameter, SelectParameter } from "../typings/sources"

export function getDefaultValues(params?: Record<string, Parameter>) {
  return params ? Object.fromEntries(Object.entries(params).map(([key, param]) => [key, param.default])) : {}
}

export function defineSelectParameter<K extends string>(R: Omit<SelectParameter<K>, "type">): SelectParameter<K> {
  return {
    type: "select",
    ...R,
  }
}

export function defineMultiSelectParameter<K extends string>(R: Omit<MultiSelectParameter<K>, "type">): MultiSelectParameter<K> {
  return {
    type: "multiselect",
    ...R,
  }
}

export const CommonSourceParams = {
  type: defineSelectParameter<"hottest" | "timeline">({
    options: [
      { label: "Hottest", value: "hottest" },
      { label: "Timeline", value: "timeline" },
    ],
    default: "timeline",
    title: "Type",
  }),
}
