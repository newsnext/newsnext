/**
 * Bounded conversions on a selected field value, applied in order before its template.
 * Keep selection/fallbacks in CSS/JMESPath and use templates for string composition.
 */
export type FieldTransform
  = | "strip_html"
    | "normalize_whitespace"
    | "first_line"
    /** Uses embedded offsets by default; format/timezone options parse local wall time (default Asia/Shanghai). */
    | "date_to_ms"
    | { op: "date_to_ms", format?: string, timezone?: string }
    | "seconds_to_ms"
    /** Parses numeric text with K/M/B/T or 千/万/亿 suffixes; invalid values are absent. */
    | "parse_compact_number"
    | "css_url"
    | "favicon_url"
    | "absolute_url"
    | "lowercase"
    | { op: "timestamp_precision", milliseconds: number }
    | { op: "normalize_lines", spacing?: number }
    /** Maximum Unicode code point count, including the suffix. Shorter inputs retain their original value. */
    | { op: "truncate", length: number, suffix?: string }
    | { op: "replace", search: string, replacement: string }
    | { op: "append", value: string }
    | { op: "regex_extract", pattern: string, group?: number }
    | { op: "regex_replace", pattern: string, replacement?: string }
    | { op: "relative_date_to_ms", timezone?: string }

export type FieldTransforms = FieldTransform | readonly FieldTransform[]
