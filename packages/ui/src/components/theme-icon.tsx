import type { Color } from "@newsnext/shared/types"
import type { SVGProps } from "react"
import { useId } from "react"

export interface ThemeIconProps extends Omit<SVGProps<SVGSVGElement>, "color"> {
  color: Color
}

export function ThemeIcon({ color, style, ...props }: ThemeIconProps): React.JSX.Element {
  const id = useId().replaceAll(":", "")
  const maskId = `${id}-mask`
  const backgroundLightId = `${id}-background-light`
  const faceLightId = `${id}-face-light`

  return (
    <svg
      viewBox="0 0 128 128"
      fill="none"
      focusable="false"
      role={props["aria-label"] ? "img" : undefined}
      aria-hidden={props["aria-label"] ? undefined : true}
      style={{ color: `var(--color-${color}-500)`, ...style }}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <mask
        id={maskId}
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        width="128"
        height="128"
      >
        <path
          d="M64-.07C52-.07 39 .3 31.951 1.004C27.8 1.402 22.175 2.711 19.451 3.912C16.728 5.113 12.614 7.942 10.308 10.199C1.774 18.553.054 27.578.054 64C.054 100.357 1.686 108.996 10.199 117.692C18.553 126.226 27.578 128.07 64 128.07C100.422 128.07 109.447 126.226 117.801 117.692C126.314 108.996 127.946 100.357 127.946 64C127.946 27.578 126.226 18.553 117.692 10.199C115.386 7.942 111.272 5.113 108.549 3.912C105.825 2.711 100.2 1.402 96.049 1.004C89 .3 76-.07 64-.07Z"
          fill="white"
        />
      </mask>
      <g mask={`url(#${maskId})`}>
        <rect width="128" height="128" fill="currentColor" />
        <rect width="128" height="128" fill={`url(#${backgroundLightId})`} />
        <path
          d="M64 94C99.3462 94 128 65.3462 128 30C128 -5.34623 99.3462 -34 64 -34C28.6538 -34 0 -5.34623 0 30C0 65.3462 28.6538 94 64 94Z"
          fill="currentColor"
        />
        <path
          d="M64 94C99.3462 94 128 65.3462 128 30C128 -5.34623 99.3462 -34 64 -34C28.6538 -34 0 -5.34623 0 30C0 65.3462 28.6538 94 64 94Z"
          fill={`url(#${faceLightId})`}
        />
      </g>
      <defs>
        <linearGradient id={backgroundLightId} x1="64" y1="0" x2="64" y2="128" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.96" />
          <stop offset="0.48" stopColor="white" stopOpacity="0.62" />
          <stop offset="0.78" stopColor="white" stopOpacity="0.2" />
          <stop offset="1" stopColor="black" stopOpacity="0.03" />
        </linearGradient>
        <linearGradient id={faceLightId} x1="64" y1="-34" x2="64" y2="94" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.97" />
          <stop offset="0.42" stopColor="white" stopOpacity="0.9" />
          <stop offset="1" stopColor="white" stopOpacity="0.58" />
        </linearGradient>
      </defs>
    </svg>
  )
}
