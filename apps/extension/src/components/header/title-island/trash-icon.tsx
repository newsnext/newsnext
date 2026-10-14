import { useAnimate } from "motion/react-mini"
import { useLayoutEffect } from "react"
import { PhTrash } from "../../icons/ph"

export function TrashIcon({ active }: { active: boolean }): React.JSX.Element {
  const [scope, animate] = useAnimate<HTMLDivElement>()

  useLayoutEffect(() => {
    const icon = scope.current
    if (!icon) return
    if (!active && icon.style.scale === "1" && icon.style.rotate === "0deg") return
    // Mini animates the native CSS scale and rotate properties independently.
    const animation = animate(icon, {
      scale: active ? 1.12 : 1,
      rotate: active ? ["-5deg", "5deg", "0deg"] : "0deg",
    }, { duration: 0.2, ease: "easeOut" })
    return animation.stop
  }, [active, animate, scope])

  return (
    <div ref={scope} style={{ scale: 1, rotate: "0deg" }}>
      <PhTrash className="size-7" />
    </div>
  )
}
