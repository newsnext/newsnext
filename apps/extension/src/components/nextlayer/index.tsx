import { WidgetContainer } from "./widget-container"

export function NextLayer() {
  return (
    <div className="h-full w-full bg-transparent">
      <WidgetContainer>
        <div className="flex min-h-52 items-center justify-center p-8">
          <p className="max-w-md text-center text-sm text-muted-foreground">
            Next Layer results must be created through the NewsNext CLI. CLI-backed rendering is not available yet.
          </p>
        </div>
      </WidgetContainer>
    </div>
  )
}
