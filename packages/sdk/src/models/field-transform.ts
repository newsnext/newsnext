/**
 * Bounded conversions on a selected field value, applied in order before its template.
 * Keep selection/fallbacks in CSS/JMESPath and use templates for string composition.
 */
export type FieldTransform
  = | "strip_html"
    | "normalize_whitespace"
    | "first_line"
    | "date_to_ms"
    | "seconds_to_ms"
    | "parse_compact_number"
    | "css_url"
    | "favicon_url"
    | "absolute_url"
    | "lowercase"
    | { op: "timestamp_precision", milliseconds: number }
    | { op: "normalize_lines", spacing?: number }
    | { op: "truncate", length: number, suffix?: string }
    | { op: "replace", search: string, replacement: string }
    | { op: "append", value: string }
    | { op: "regex_extract", pattern: string, group?: number }
    | { op: "regex_replace", pattern: string, replacement?: string }
    | { op: "relative_date_to_ms", timezone?: string }

export type FieldTransforms = FieldTransform | readonly FieldTransform[]
