/* eslint-disable react-refresh/only-export-components */
import { resolveSquircleStyle } from "@newsnext/ui/hooks/use-squircle"
import { useCornerRendering } from "@/cosmos/corner-rendering-context"

const CORNER_SHAPES = [
  { height: 32, radius: 8, width: 32 },
  { height: 40, radius: 10, width: 40 },
  { height: 44, radius: 12, width: 48 },
  { height: 48, radius: 13, width: 56 },
  { height: 52, radius: 14, width: 68 },
  { height: 56, radius: 15, width: 80 },
  { height: 60, radius: 17, width: 96 },
  { height: 64, radius: 18, width: 112 },
  { height: 68, radius: 20, width: 128 },
  { height: 72, radius: 22, width: 148 },
  { height: 76, radius: 24, width: 168 },
  { height: 80, radius: 26, width: 192 },
  { height: 88, radius: 30, width: 220 },
  { height: 96, radius: 32, width: 256 },
] as const

function CornerShapesFixture(): React.JSX.Element {
  const { rendering } = useCornerRendering()

  return (
    <main className="mx-auto grid min-h-full w-full max-w-5xl content-start gap-8 p-8">
      <header className="grid gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Basics</p>
        <h1 className="text-xl font-semibold">Corner shapes</h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          Compare corner rendering across increasing sizes and aspect ratios.
        </p>
      </header>
      <section className="grid gap-x-8 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
        {CORNER_SHAPES.map(shape => (
          <figure
            key={`${shape.width}x${shape.height}`}
            className="grid min-h-40 content-end justify-items-center gap-3"
          >
            <div className="flex h-28 w-full items-end justify-center">
              <div
                data-squircle
                className="bg-primary shadow-lg shadow-primary/15 ring-1 ring-primary-foreground/20"
                style={{
                  height: shape.height,
                  width: shape.width,
                  ...resolveSquircleStyle(shape.radius, rendering),
                }}
              />
            </div>
            <figcaption className="font-mono text-xs tabular-nums text-muted-foreground">
              {shape.width}
              ×
              {shape.height}
              {" · R"}
              {shape.radius}
            </figcaption>
          </figure>
        ))}
      </section>
    </main>
  )
}

export default {
  "Corner shapes": CornerShapesFixture,
}
