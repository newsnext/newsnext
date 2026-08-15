import type { ReactNode } from "react"
import { Card, CardContent } from "@newsnext/ui/components/card"
import { cn } from "@newsnext/ui/lib/utils"

interface ConfigSectionBaseProps {
  children: ReactNode
  title: ReactNode
  className?: string
  description?: ReactNode
  surface?: boolean
  surfaceClassName?: string
  titleAccessory?: ReactNode
}

interface SectionProps extends ConfigSectionBaseProps {
  variant?: "section"
  htmlFor?: never
}

interface FieldProps extends ConfigSectionBaseProps {
  variant: "field"
  htmlFor: string
}

interface GroupProps extends ConfigSectionBaseProps {
  variant: "group"
  htmlFor?: never
}

type ConfigSectionProps = FieldProps | GroupProps | SectionProps

export function ConfigSection(props: ConfigSectionProps): React.JSX.Element {
  const {
    children,
    className,
    description,
    surface,
    surfaceClassName,
    title,
    titleAccessory,
  } = props
  const variant = props.variant ?? "section"
  const Root = variant === "group" ? "fieldset" : variant === "field" ? "div" : "section"

  return (
    <Root className={className}>
      <SettingsTitle
        htmlFor={variant === "field" ? props.htmlFor : undefined}
        title={title}
        titleAccessory={titleAccessory}
        variant={variant}
      />
      {description && (
        <p className="mt-0.5 px-0.5 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      )}
      <div className="mt-2">
        <ConfigSectionBody className={surfaceClassName} surface={surface}>
          {children}
        </ConfigSectionBody>
      </div>
    </Root>
  )
}

function SettingsTitle({
  htmlFor,
  title,
  titleAccessory,
  variant,
}: {
  title: ReactNode
  htmlFor?: string
  titleAccessory?: ReactNode
  variant: "field" | "group" | "section"
}): React.JSX.Element {
  const content = (
    <span className="flex items-center justify-between gap-4">
      <span>{title}</span>
      {titleAccessory}
    </span>
  )
  const className = "block w-full px-0.5 text-sm font-semibold"

  if (variant === "field") {
    return <label htmlFor={htmlFor} className={className}>{content}</label>
  }

  const Title = variant === "group" ? "legend" : "h3"
  return <Title className={className}>{content}</Title>
}

function ConfigSectionBody({
  children,
  className,
  surface = true,
}: {
  children: ReactNode
  className?: string
  surface?: boolean
}): React.JSX.Element {
  if (!surface) return <>{children}</>

  return (
    <Card variant="subtle">
      <CardContent className={cn("grid gap-2 p-2.5", className)}>
        {children}
      </CardContent>
    </Card>
  )
}
