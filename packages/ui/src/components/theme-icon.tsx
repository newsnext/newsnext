import type { Color } from "@newsnext/shared/types"
import type { SVGProps } from "react"
import { useId } from "react"

export interface ThemeIconProps extends Omit<SVGProps<SVGSVGElement>, "color"> {
  color: Color
}

export function ThemeIcon({ color, style, ...props }: ThemeIconProps): React.JSX.Element {
  const id = useId().replaceAll(":", "")
  const maskId = `${id}-mask`
  const backgroundId = `${id}-background`
  const depthId = `${id}-depth`
  const faceId = `${id}-face`
  const faceDepthId = `${id}-face-depth`
  const highlightId = `${id}-highlight`

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
        style={{ maskType: "luminance" }}
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
        <rect width="128" height="128" fill={`url(#${backgroundId})`} />
        <path
          d="M0 86C15 104 36 113 64 113C92 113 113 104 128 86V128H0V86Z"
          fill={`url(#${depthId})`}
        />
        <path
          d="M64 94C99.3462 94 128 65.3462 128 30C128 -5.34623 99.3462 -34 64 -34C28.6538 -34 0 -5.34623 0 30C0 65.3462 28.6538 94 64 94Z"
          fill={`url(#${faceId})`}
          filter={`url(#${faceDepthId})`}
        />
        <path
          d="M0 30C0 65.346 28.654 94 64 94C99.346 94 128 65.346 128 30C128 64.8 99.346 93 64 93C28.654 93 0 64.8 0 30Z"
          fill="white"
          fillOpacity="0.14"
          filter={`url(#${highlightId})`}
        />
        <path
          d="M8 5C13.3 1.7 20.7 0 31 0H97C107.3 0 114.7 1.7 120 5"
          stroke="white"
          strokeOpacity="0.38"
        />
      </g>
      <defs>
        <linearGradient id={backgroundId} x1="64" y1="0" x2="64" y2="128" gradientUnits="userSpaceOnUse">
          <stop stopColor="color-mix(in oklab, currentColor 6%, white)" />
          <stop offset="0.32" stopColor="color-mix(in oklab, currentColor 20%, white)" />
          <stop offset="0.56" stopColor="color-mix(in oklab, currentColor 52%, white)" />
          <stop offset="0.76" stopColor="color-mix(in oklab, currentColor 88%, white)" />
          <stop offset="0.9" stopColor="currentColor" />
          <stop offset="1" stopColor="color-mix(in oklab, currentColor 96%, black)" />
        </linearGradient>
        <linearGradient id={depthId} x1="64" y1="90" x2="64" y2="128" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" stopOpacity="0" />
          <stop offset="0.55" stopColor="currentColor" stopOpacity="0.06" />
          <stop offset="1" stopColor="color-mix(in oklab, currentColor 82%, black)" stopOpacity="0.26" />
        </linearGradient>
        <linearGradient id={faceId} x1="64" y1="-34" x2="64" y2="94" gradientUnits="userSpaceOnUse">
          <stop stopColor="color-mix(in oklab, currentColor 1%, white)" />
          <stop offset="0.34" stopColor="color-mix(in oklab, currentColor 4%, white)" />
          <stop offset="0.6" stopColor="color-mix(in oklab, currentColor 12%, white)" />
          <stop offset="0.8" stopColor="color-mix(in oklab, currentColor 26%, white)" />
          <stop offset="1" stopColor="color-mix(in oklab, currentColor 52%, white)" />
        </linearGradient>
        <filter
          id={faceDepthId}
          x="-5"
          y="-39"
          width="138"
          height="143"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feDropShadow
            dx="0"
            dy="2"
            stdDeviation="1.7"
            floodColor="color-mix(in oklab, currentColor 78%, black)"
            floodOpacity="0.17"
          />
        </filter>
        <filter
          id={highlightId}
          x="-2"
          y="28"
          width="132"
          height="68"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation="0.35" />
        </filter>
      </defs>
    </svg>
  )
}
