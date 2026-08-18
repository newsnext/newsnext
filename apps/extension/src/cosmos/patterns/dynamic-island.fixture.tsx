/* eslint-disable react-refresh/only-export-components */
import { DynamicIsland } from "@newsnext/ui/components/dynamic-island"
import { Logo } from "@newsnext/ui/components/logo"

function DynamicIslandFixture(): React.JSX.Element {
  return (
    <main className="min-h-full bg-muted/30 p-8 pt-24 text-center">
      <DynamicIsland top={84} largeWidth={360} largeHeight={180}>
        {isSmall => isSmall
          ? <div className="grid h-full place-items-center text-xs">Open controls</div>
          : (
              <div className="grid h-full place-content-center gap-3 p-6">
                <Logo className="mx-auto size-12 text-primary" />
                <strong>Dynamic island</strong>
                <span className="text-xs text-muted-foreground">Click outside or scroll to close.</span>
              </div>
            )}
      </DynamicIsland>
      <p className="text-sm text-muted-foreground">The island is fixed below the catalog appearance control.</p>
    </main>
  )
}

export default {
  Default: DynamicIslandFixture,
}
