import type { SourceIconSettings } from "@/lib/source-icon"
import { atomWithStorage } from "jotai/utils"
import {
  DEFAULT_SOURCE_ICON_SETTINGS,

} from "@/lib/source-icon"

const SOURCE_ICON_SETTINGS_KEY = "newsnext-source-icon-settings"

export const sourceIconSettingsAtom = atomWithStorage<SourceIconSettings>(
  SOURCE_ICON_SETTINGS_KEY,
  DEFAULT_SOURCE_ICON_SETTINGS,
  undefined,
  { getOnInit: true },
)
