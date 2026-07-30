import type { SourceDescriptor } from "@/typings/source"
import { useAtomValue } from "jotai"
import { resolveSourceIcon } from "@/lib/source-icon"
import { sourceIconSettingsAtom } from "@/store/settings"

type SourceIconDescriptor = Pick<SourceDescriptor, "home" | "provider">

export function useSourceIcon(source: SourceIconDescriptor): string | undefined {
  const settings = useAtomValue(sourceIconSettingsAtom)
  return resolveSourceIcon(
    source.provider.icon,
    source.home,
    settings.template,
  )
}
