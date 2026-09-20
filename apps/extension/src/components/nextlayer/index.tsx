import { useI18n } from "@/hooks/use-i18n"
import { LiveWidgetGrid } from "./live-widget-grid"

interface NextLayerProps {
  boardId: string
  onReady?: () => void
  viewReady: boolean
}

export function NextLayer({ boardId, onReady, viewReady }: NextLayerProps) {
  const { t } = useI18n()
  return (
    <>
      <h1 className="sr-only">{t("nextLayerTitle")}</h1>
      <LiveWidgetGrid
        boardId={boardId}
        onReady={onReady}
        viewReady={viewReady}
      />
    </>
  )
}
