import Avatar from "boring-avatars"

const colors = [
  "var(--color-theme-200)",
  "var(--color-theme-300)",
  "var(--color-theme-500)",
  "var(--color-theme-700)",
  "var(--color-theme-900)",
]

interface CardAvatarProps {
  seed: string
  title: string
  variant?: "bauhaus" | "beam"
}

export function CardAvatar({ seed, title, variant = "bauhaus" }: CardAvatarProps): React.JSX.Element {
  return (
    <Avatar
      name={seed}
      variant={variant}
      colors={colors}
      size="100%"
      aria-label={title}
      focusable="false"
      className="size-full overflow-hidden rounded-full"
    />
  )
}
