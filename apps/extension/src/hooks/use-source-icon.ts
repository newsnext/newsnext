import type { SourceDescriptor } from "@/typings/source"
import { useAtomValue } from "jotai"
import { resolveSourceIcon } from "@/lib/source"
import { sourceIconSettingsAtom } from "@/store/settings"

type SourceIconDescriptor = Pick<SourceDescriptor, "metadata" | "provider">

export function useSourceIcon(source: SourceIconDescriptor): string | undefined {
  const settings = useAtomValue(sourceIconSettingsAtom)
  return resolveSourceIcon(
    source.provider.icon,
    source.metadata.home,
    settings.template,
  )
}
