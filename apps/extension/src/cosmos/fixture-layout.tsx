import { cn } from "@/lib/utils"

interface FixturePageProps extends React.PropsWithChildren {
  category: "Basics" | "Cards" | "Patterns"
  description: string
  title: string
  width?: "md" | "lg" | "xl"
}

const WIDTH_CLASSES: Record<NonNullable<FixturePageProps["width"]>, string> = {
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
}

export function FixturePage({
  category,
  children,
  description,
  title,
  width = "lg",
}: FixturePageProps): React.JSX.Element {
  return (
    <main className="min-h-full p-6 sm:p-10">
      <div className={cn("mx-auto grid content-start gap-8", WIDTH_CLASSES[width])}>
        <header className="grid gap-2 border-b border-border/60 pb-5">
          <p className="font-mono text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">{category}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        </header>
        {children}
      </div>
    </main>
  )
}

interface FixtureSectionProps extends React.PropsWithChildren {
  className?: string
  description?: string
  title: string
}

export function FixtureSection({ children, className, description, title }: FixtureSectionProps): React.JSX.Element {
  return (
    <section className={cn("grid gap-4 rounded-2xl border border-border/60 bg-background/35 p-5", className)}>
      <header className="grid gap-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && <p className="text-xs leading-5 text-muted-foreground">{description}</p>}
      </header>
      {children}
    </section>
  )
}

export function FixtureState({ children, label }: React.PropsWithChildren<{ label: string }>): React.JSX.Element {
  return (
    <div className="grid min-w-0 gap-2">
      <span className="font-mono text-[10px] font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
      {children}
    </div>
  )
}
