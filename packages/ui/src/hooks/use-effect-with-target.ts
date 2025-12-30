import { createEffectWithTarget } from "@newsnext/ui/lib/create-effect-with-target"
import { useEffect } from "react"

export const useEffectWithTarget = createEffectWithTarget(useEffect)
