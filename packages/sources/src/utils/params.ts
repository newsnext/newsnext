import type { MulitSelect, Parameter, Select } from "../typings/sources"

export function getDefaultValues(params?: Record<string, Parameter>) {
  return params ? Object.fromEntries(Object.entries(params).map(([key, param]) => [key, param.default])) : {}
}

export function defineSelect<K extends string>(R: Omit<Select<K>, "type">): Select<K> {
  return {
    type: "select",
    ...R,
  }
}

export function defineMulitSelect<K extends string>(R: Omit<MulitSelect<K>, "type">): MulitSelect<K> {
  return {
    type: "multiselect",
    ...R,
  }
}

export const CommonSourceParams = {
  type: defineSelect<"hottest" | "timeline" | "realtime">({
    options: [
      { label: "Hottest", value: "hottest" },
      { label: "Realtime", value: "realtime" },
      { label: "Timeline", value: "timeline" },
    ],
    default: "realtime",
    title: "Type",
  }),
}
