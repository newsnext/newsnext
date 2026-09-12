export const WIDGET_CATALOG_CHANGED = "newsnext.widget-catalog.changed"

export interface WidgetCatalogChangedMessage {
  type: typeof WIDGET_CATALOG_CHANGED
}

export function isWidgetCatalogChangedMessage(
  value: unknown,
): value is WidgetCatalogChangedMessage {
  return value !== null
    && typeof value === "object"
    && "type" in value
    && value.type === WIDGET_CATALOG_CHANGED
}
