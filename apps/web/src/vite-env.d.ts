/// <reference types="vite/client" />
/// <reference lib="webworker" />
/// <reference types="unplugin-icons/types/react" />

declare module "*.svg?url&raw" {
  const content: string
  export default content
}

interface DocumentPictureInPictureOptions {
  width?: number
  height?: number
}

interface DocumentPictureInPicture extends EventTarget {
  requestWindow: (options?: DocumentPictureInPictureOptions) => Promise<Window>
}

interface Window {
  documentPictureInPicture?: DocumentPictureInPicture
}
