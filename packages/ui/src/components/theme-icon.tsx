import type { Color } from "@newsnext/shared/types"
import type { ImgHTMLAttributes } from "react"

export interface ThemeIconProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  color: Color
}

export function ThemeIcon({ alt = "", color, ...props }: ThemeIconProps): React.JSX.Element {
  return (
    <img
      alt={alt}
      draggable={false}
      src={`/theme-icons/${color}.png`}
      {...props}
    />
  )
}
